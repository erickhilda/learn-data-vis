'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as d3 from 'd3';

function Axis({ domain = [0, 100], range = [10, 290] }) {
  const ref = useRef();

  // d3 way
  // useEffect(() => {
  //   const xScale = d3.scaleLinear().domain([0, 100]).range([10, 290]);
  //   const svgElement = d3.select(ref.current);
  //   const axisGenerator = d3.axisBottom(xScale);
  //   svgElement.append('g').call(axisGenerator);
  // }, []);

  // react way
  const xTicks = useMemo(() => {
    const xScale = d3.scaleLinear().domain(domain).range(range);
    return xScale.ticks().map((value) => ({
      value,
      xOffset: xScale(value),
    }));
  }, [domain, range]);

  const yTicks = useMemo(() => {
    const yScale = d3.scaleLinear().domain(domain).range(range);
    return yScale.ticks().map((value) => ({
      value,
      yOffset: yScale(value),
    }));
  }, [domain, range]);

  return (
    <svg ref={ref}>
      <path d="M 6 9.5 V 290.5" stroke="currentColor" />
      {yTicks.map(({ value, yOffset }) => (
        <g key={value} transform={`translate(0, ${yOffset})`}>
          <line x2="6" stroke="currentColor" />
          <text
            key={value}
            style={{
              fontSize: '10px',
              textAnchor: 'end',
            }}
          >
            {value}
          </text>
        </g>
      ))}

      <path d="M 9.5 0.5 H 290.5" stroke="currentColor" />
      {xTicks.map(({ value, xOffset }) => (
        <g key={value} transform={`translate(${xOffset}, 0)`}>
          <line y2="6" stroke="currentColor" />
          <text
            key={value}
            style={{
              fontSize: '10px',
              textAnchor: 'middle',
              transform: 'translateY(20px)',
            }}
          >
            {value}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default Axis;
