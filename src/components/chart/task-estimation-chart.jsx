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
  const [hoveredBin, setHoveredBin] = useState(null);
  const tooltipRef = useRef(null);

  const [displayTooltip, setDisplayTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(initialTooltipData);
  function handleMouseEnter(e, datum, idx) {
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
    // styling the hovered bin
    binsRef.current.children[idx].classList.add('hovered');
    setHoveredBin(binsRef.current.children[idx]);

    setTooltipData({
      range,
      task: taskSample,
      count,
      barValue: formatHours(percentDeveloperHours),
      barPercentage: percentDeveloperHours * 100,
    });
    setDisplayTooltip(true);
  }

  function handleMouseLeave(idx) {
    setDisplayTooltip(false);
    setTooltipData(initialTooltipData);
    hoveredBin?.classList.remove('hovered');
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="font-extrabold max-w-xs mb-4 text-center text-2xl">
        Task estimation errors over ten years of commercial development
      </h2>

      <div className="relative">
        <svg width={width} height={dimensions.height}>
          <g
            transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}
          >
            {/* chant background */}
            <g className="fill-gray-700 text-xs font-sans font-semibold opacity-80 mix-blend-hard-light">
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
                className="fill-slate-50"
                y={-20}
                width={dimensions.boundedWidth / 2}
                height={dimensions.boundedHeight + 20}
              />
              <rect
                className="fill-slate-300"
                x={dimensions.boundedWidth / 2 + 1}
                y={-20}
                width={dimensions.boundedWidth / 2}
                height={dimensions.boundedHeight + 20}
              />
            </g>

            {/* bar chart data */}
            <g className="bins" ref={binsRef}>
              {binsGenerator(dataset).map((bin, idx) => (
                <rect
                  key={idx}
                  className="fill-indigo-500 transition-all"
                  x={xScale(bin.x0)}
                  y={yScale(yAccessor(bin))}
                  width={d3.max([
                    0,
                    xScale(bin.x1) - xScale(bin.x0) - barPadding,
                  ])}
                  height={dimensions.boundedHeight - yScale(yAccessor(bin))}
                />
              ))}
            </g>

            {/* bar interaction enhancement */}
            <g className="bins">
              {binsGenerator(dataset).map((bin, idx) => (
                <rect
                  key={idx}
                  className="fill-transparent"
                  x={xScale(bin.x0)}
                  y={-dimensions.margin.top}
                  width={d3.max([0, xScale(bin.x1) - xScale(bin.x0)])}
                  height={dimensions.boundedHeight + dimensions.margin.top}
                  onMouseEnter={(e) => handleMouseEnter(e, bin, idx)}
                  onMouseLeave={() => handleMouseLeave()}
                />
              ))}
            </g>

            {/* mean line */}
            <text className="mean-label" x={xScale(mean)} y={-25}>
              mean
            </text>
            <line
              className="mean-line"
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
              className="x-axis"
            >
              <text
                className="fill-slate-500 text-xs capitalize"
                transform={`translate(${
                  dimensions.boundedWidth / 2 - dimensions.margin.left
                }, 40)`}
              >
                Hours over-estimated
              </text>
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
          <div className="font-semibold mb-1">{tooltipData.range}</div>
          <div className="mt-3 mb-1 text-xs font-light opacity-60 overflow-hidden text-ellipsis max-w-sm">
            {tooltipData.task.map((task) => (
              <span key={task}>{task}</span>
            ))}
          </div>
          <div className="mb-1 text-xs font-medium">
            ...of <span id="count">{tooltipData.count}</span> tasks
          </div>
          <div className="text-xs mb-1 mt-4">
            <b>
              <span id="tooltip-bar-value">{tooltipData.barValue}</span>%
            </b>
            of the work was done by developers
          </div>
          <div className="mb-2 relative w-full h-3 bg-slate-300">
            <div
              className="bg-indigo-950 h-full"
              style={{ width: `${tooltipData.barPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskEstimationChart;
