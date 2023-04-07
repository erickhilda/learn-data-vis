'use client';

import * as d3 from 'd3';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const initialTooltipData = {
  range: '',
  count: '',
  task: [],
  barPercentage: '',
  barValue: '',
};

function TaskEstimationChart() {
  const width = 600;
  let dimensions = {
    width: width,
    height: width * 0.5,
    margin: {
      top: 35,
      right: 10,
      bottom: 50,
      left: 50,
    },
    boundedWidth: 0,
    boundedHeight: 0,
  };
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  const summaryAccessor = useCallback((d) => d.Summary, []);
  const actualHoursAccessor = useCallback((d) => +d.HoursActual, []);
  const developerHoursAccessor = useCallback(
    (d) => +d.DeveloperHoursActual,
    []
  );
  const diffAccessor = useCallback(
    (d) => +d.HoursEstimate - actualHoursAccessor(d),
    [actualHoursAccessor]
  );
  const yAccessor = (d) => d.length;

  const [dataset, setDataset] = useState([]);
  useEffect(() => {
    async function fetchData() {
      let data = await d3.csv('/task_estimation.csv');

      let usedTasks = {};
      data = data.filter((d) => {
        const hours = actualHoursAccessor(d);
        if (usedTasks[summaryAccessor(d)]) {
          const hasHigherValue = hours > usedTasks[summaryAccessor(d)];
          if (!hasHigherValue) return false;
        }
        usedTasks[summaryAccessor(d)] = hours;
        return actualHoursAccessor(d) > 10;
      });

      data = data.filter(
        (d) => diffAccessor(d) >= -50 && diffAccessor(d) <= 50
      );

      setDataset(data);
    }

    fetchData();
  }, [actualHoursAccessor, diffAccessor, summaryAccessor]);

  const xScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain(d3.extent(dataset, diffAccessor))
      .range([0, dimensions.boundedWidth])
      .nice();
  }, [dataset, diffAccessor, dimensions.boundedWidth]);

  const xTicks = useMemo(() => {
    return xScale.ticks().map((value) => ({
      value,
      xOffset: xScale(value),
    }));
  }, [xScale]);

  const mean = useMemo(() => {
    return d3.mean(dataset, diffAccessor);
  }, [dataset, diffAccessor]);

  const binsGenerator = useMemo(() => {
    return d3.bin().domain(xScale.domain()).value(diffAccessor).thresholds(30);
  }, [diffAccessor, xScale]);

  const bins = useMemo(() => {
    return binsGenerator(dataset);
  }, [binsGenerator, dataset]);

  const yScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([0, d3.max(bins, yAccessor)])
      .range([dimensions.boundedHeight, 0])
      .nice();
  }, [bins, dimensions.boundedHeight]);
  const barPadding = 1.5;

  const binsRef = useRef([]);
  const tooltipRef = useRef(null);

  const [selectedBin, setSelectedBin] = useState(null);
  const [displayTooltip, setDisplayTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(initialTooltipData);
  function handleMouseEnter(e, datum) {
    // tooltip essential value
    const range = [
      datum.x0 < 0 ? `Under-estimated by` : `Over-estimated by`,
      Math.abs(datum.x0),
      'to',
      Math.abs(datum.x1),
      'hours',
    ].join(' ');
    const taskSample = datum.slice(0, 3).map(summaryAccessor);
    const count = Math.max(0, yAccessor(datum) - 2);

    const percentDeveloperHoursValues = datum.map(
      (d) => developerHoursAccessor(d) / actualHoursAccessor(d) || 0
    );
    const percentDeveloperHours = d3.mean(percentDeveloperHoursValues);
    const formatHours = (d) => d3.format(',.2f')(Math.abs(d));

    // tooltip position
    const x =
      xScale(datum.x0) +
      (xScale(datum.x1) - xScale(datum.x0)) / 2 +
      dimensions.margin.left;
    const y = yScale(yAccessor(datum)) + dimensions.margin.top;
    tooltipRef.current.style.transform = `translate(calc( -50% + ${x}px), calc(-100% + ${y}px))`;

    setTooltipData({
      range,
      task: taskSample,
      count,
      barValue: formatHours(percentDeveloperHours),
      barPercentage: percentDeveloperHours * 100,
    });
    setDisplayTooltip(true);
  }

  function handleMouseLeave() {
    setDisplayTooltip(false);
    setTooltipData(initialTooltipData);
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-extrabold text-slate-600 max-w-md text-center mb-4">
        Task estimation errors over ten years of commercial development
      </h2>

      <div id="wrapper" className="relative">
        <svg width={width} height={dimensions.height}>
          <g
            transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}
          >
            {/* chant background */}
            <g className="label">
              <text className="left-side-label" x={10} y={-25}>
                Under-estimated
              </text>
              <text
                className="right-side-label"
                x={dimensions.boundedWidth - 10}
                y={-25}
              >
                Over-estimated
              </text>

              <rect
                className="background left-side-background"
                y={-20}
                width={dimensions.boundedWidth / 2}
                height={dimensions.boundedHeight + 20}
              />
              <rect
                className="background right-side-background"
                x={dimensions.boundedWidth / 2 + 1}
                y={-20}
                width={dimensions.boundedWidth / 2}
                height={dimensions.boundedHeight + 20}
              />
            </g>

            {/* bar chart data */}
            <g className="bins" ref={binsRef}>
              {binsGenerator(dataset).map((bin) => (
                <rect
                  key={bin.x0}
                  className="bin"
                  x={xScale(bin.x0)}
                  y={yScale(yAccessor(bin))}
                  width={d3.max([
                    0,
                    xScale(bin.x1) - xScale(bin.x0) - barPadding,
                  ])}
                  height={dimensions.boundedHeight - yScale(yAccessor(bin))}
                  onMouseEnter={(e) => handleMouseEnter(e, bin)}
                  onMouseLeave={() => handleMouseLeave()}
                />
              ))}
            </g>

            {/* bar interaction enhancement */}
            {/* <g className="bins">
              {binsGenerator(dataset).map((bin) => (
                <rect
                  key={bin.x0}
                  className="listeners"
                  x={xScale(bin.x0)}
                  y={-dimensions.margin.top}
                  width={d3.max([0, xScale(bin.x1) - xScale(bin.x0)])}
                  height={dimensions.boundedHeight + dimensions.margin.top}
                  onMouseEnter={() => handleMouseEnter(bin.x0)}
                  onMouseLeave={() => handleMouseLeave(bin)}
                />
              ))}
            </g> */}

            {/* mean line */}
            <text className="mean-label" x={xScale(mean)} y={-25}>
              mean
            </text>
            <line
              className="mean"
              x1={xScale(mean)}
              x2={xScale(mean)}
              y1={-20}
              y2={dimensions.boundedHeight}
            ></line>

            {/* x-axis */}
            <path
              d={`M 0 ${dimensions.boundedHeight} H ${dimensions.boundedWidth}`}
              stroke="currentColor"
            />
            <g
              transform={`translate(0, ${dimensions.boundedHeight})`}
              className=""
            >
              {xTicks.map(({ value, xOffset }) => (
                <g key={value} transform={`translate(${xOffset})`} className="">
                  <line y2="6" stroke="currentColor" />
                  <text
                    key={value}
                    style={{ textAnchor: 'middle', fontSize: '0.625rem' }}
                    y={18}
                  >
                    {value}
                  </text>
                </g>
              ))}
            </g>
          </g>
        </svg>

        <div
          ref={tooltipRef}
          className="tooltip"
          style={{ opacity: displayTooltip ? 1 : 0 }}
        >
          <div className="tooltip-range" id="range">
            {tooltipData.range}
          </div>
          <div className="tooltip-examples" id="examples">
            {tooltipData.task.map((task) => (
              <span key={task}>{task}</span>
            ))}
          </div>
          <div className="tooltip-value">
            ...of <span id="count">{tooltipData.count}</span> tasks
          </div>
          <div className="tooltip-bar-value">
            <b>
              <span id="tooltip-bar-value">{tooltipData.barValue}</span>%
            </b>
            of the work was done by developers
          </div>
          <div className="tooltip-bar">
            <div
              className="tooltip-bar-fill"
              style={{ width: `${tooltipData.barPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskEstimationChart;
