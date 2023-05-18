'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import * as d3 from 'd3';

const initialTooltipData = {
  title: '',
  actual: '',
  estimate: '',
};

function ScatterTaskEstimation() {
  // set data
  const summaryAccessor = useCallback((d) => d.Summary, []);
  const actualHoursAccessor = useCallback((d) => +d.HoursActual, []);
  const diffAccessor = useCallback(
    (d) => +d.HoursEstimate - actualHoursAccessor(d),
    [actualHoursAccessor],
  );
  const xAccessor = (d) => d.HoursActual;
  const yAccessor = (d) => d.HoursEstimate;

  const [dataset, setDataset] = useState([]);
  useEffect(() => {
    async function fetchData() {
      let data = await d3.csv('/task_estimation.csv');

      data = data.filter((d) => xAccessor(d) < 500 && yAccessor(d) < 500);

      let usedTasks = {};
      data = data.filter((d) => {
        const hours = actualHoursAccessor(d);
        if (usedTasks[summaryAccessor(d)]) {
          const hasHigherValue = hours > usedTasks[summaryAccessor(d)];
          if (!hasHigherValue) return false;
        }
        usedTasks[summaryAccessor(d)] = hours;
        return true;
      });

      setDataset(data);
    }

    fetchData();
  }, [actualHoursAccessor, diffAccessor, summaryAccessor]);

  // set dimensions
  let dimensions = {
    width: 600,
    height: 480,
    margin: {
      top: 10,
      right: 10,
      bottom: 50,
      left: 50,
    },
  };
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  // set scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();
  const xTicks = useMemo(() => {
    return xScale.ticks().map((value) => ({
      value,
      xOffset: xScale(value),
    }));
  }, [xScale]);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();
  const yTicks = useMemo(() => {
    return yScale.ticks().map((value) => ({
      value,
      yOffset: yScale(value),
    }));
  }, [yScale]);

  // handle tooltip data
  // const [hoveredBin, setHoveredBin] = useState(null);
  const tooltipRef = useRef(null);

  const [displayTooltip, setDisplayTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(initialTooltipData);
  function handleMouseEnter(datum) {
    const formatHours = d3.format(',.0f');
    const actual = formatHours(xAccessor(datum));
    const estimate = formatHours(yAccessor(datum));

    const diff = diffAccessor(datum);
    const diffFormat = d3.format(',.1f');
    const title = `${diffFormat(Math.abs(diff))} hours, ${
      diff > 0 ? 'over' : 'under'
    } estimated`;

    const x = xScale(xAccessor(datum)) + dimensions.margin.left;
    const y = yScale(yAccessor(datum)) + dimensions.margin.top;

    tooltipRef.current.style.transform = `translate(calc( -50% + ${x}px), calc(-100% + ${y}px))`;

    const tooltip = {
      actual,
      title,
      estimate,
    };

    setTooltipData(tooltip);
    setDisplayTooltip(true);
  }

  function handleMouseLeave() {
    setTooltipData({});
    setDisplayTooltip(false);
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-extrabold max-w-xs mb-4 text-center text-2xl">
        Scatter Chart Task Estimation
      </h1>

      <div className="relative">
        <svg width={dimensions.width} height={dimensions.height}>
          <g>
            {dataset.map((d, i) => (
              <circle
                key={i}
                cx={xScale(xAccessor(d)) + dimensions.margin.left}
                cy={yScale(yAccessor(d))}
                r={4}
                className="fill-indigo-500 hover:fill-cyan-500"
                stroke="black"
                onMouseEnter={() => handleMouseEnter(d)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </g>

          {/* draw x-axis */}
          <line
            x1={dimensions.margin.left}
            x2={dimensions.width - dimensions.margin.right}
            y1={dimensions.boundedHeight}
            y2={dimensions.boundedHeight}
            stroke="black"
          />
          <g transform={`translate(0, ${dimensions.boundedHeight})`}>
            {xTicks.map(({ value, xOffset }) => (
              <g
                key={value}
                transform={`translate(${xOffset + dimensions.margin.left})`}
                className=""
              >
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
            <text
              className="fill-slate-500 text-xs capitalize"
              x={dimensions.boundedWidth / 2}
              y={dimensions.margin.bottom - 10}
            >
              Actual Hours
            </text>
          </g>

          {/* draw y-axis */}
          <line
            x1={dimensions.margin.left}
            x2={dimensions.margin.left}
            y1={0}
            y2={dimensions.boundedHeight}
            stroke="black"
          />
          <g transform={`translate(${dimensions.margin.left - 20}, 0)`}>
            {yTicks.map(({ value, yOffset }) => (
              <g key={value} transform={`translate(0, ${yOffset})`}>
                <line x1="15" x2="20" stroke="currentColor" />
                <text
                  key={value}
                  style={{ textAnchor: 'end', fontSize: '0.625rem' }}
                  x={10}
                  y={3}
                >
                  {value}
                </text>
              </g>
            ))}
            <text
              className="fill-slate-500 text-xs capitalize rotate-90"
              x={dimensions.boundedHeight / 2}
              y={dimensions.margin.left - 20}
            >
              Estimated Hours
            </text>
          </g>
        </svg>

        <div
          ref={tooltipRef}
          className="tooltip"
          style={{ opacity: displayTooltip ? 1 : 0 }}
        >
          <div className="text-base font-semibold mb-1">
            {tooltipData.title}
          </div>
          <div className="flex justify-between text-xs">
            <span>Actual Hours: </span>
            <span
              className="text-right font-bold"
              style={{ fontFeatureSettings: 'tnum 1' }}
            >
              {tooltipData.actual}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Estimated Hours: </span>
            <span
              className="text-right font-bold"
              style={{ fontFeatureSettings: 'tnum 1' }}
            >
              {tooltipData.estimate}
            </span>
          </div>
          <div className="tooltip-tasks"></div>
        </div>
      </div>
    </div>
  );
}

export default ScatterTaskEstimation;
