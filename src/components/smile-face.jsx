'use client';

import * as d3 from 'd3';

const width = 100;
const height = 100;

function SmileFace() {
  // create arc to be use as smile
  const smileArc = d3
    .arc()
    .innerRadius(25)
    .outerRadius(30)
    .startAngle(Math.PI / 2)
    .endAngle((Math.PI * 3) / 2);

  // M 30 70 Q 50 100 70 70
  return (
    <svg height={height} width={height}>
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        <circle r="45" fill="yellow" stroke="black" strokeWidth={5} />
        <circle transform={`translate(-20, -15)`} r="10" fill="black" />
        <circle transform={`translate(20, -15)`} r="10" fill="black" />
        <path d={smileArc()} stroke="black" fill="black" />
      </g>
    </svg>
  );
}

export default SmileFace;
