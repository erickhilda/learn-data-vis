'use client';

import { useEffect, useState } from 'react';
import * as d3 from 'd3';

const csvUrl =
  'https://gist.githubusercontent.com/erickhilda/4a46ba3ca978c12a97f58049a09ac830/raw/d5a15d4cdf7019d24ecf8ebe9e34b789b06a094e/css_names_color.csv';
async function fetchColorData(url) {
  try {
    const res = await fetch(url);
    return res;
  } catch (error) {
    console.error(error);
  }
}

function CssColorTable() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // fetch data and parse its data using d3 parse csv function
    fetchColorData(csvUrl).then((res) => {
      res.text().then((data) => {
        const parsedData = d3.csvParse(data);
        setData(parsedData);
      });
    });
  }, []);

  if (!data) {
    return <pre>Loading...</pre>;
  }

  return (
    <div className="covid-chart">
      <h1 className="text-3xl font-bold underline">Covid Chart</h1>
      {/* render data as table, use data[columns] as column */}
      <table className="border">
        <thead>
          <tr>
            {data['columns'].map((data) => (
              <th className="border p-2" key={data}>
                {data}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            return (
              <tr key={i}>
                <td className="border p-2">{row.specification}</td>
                <td className="border p-2">{row.keyword}</td>
                <td
                  className="border p-2"
                  style={{ background: row.hex_value }}
                >
                  {row.hex_value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CssColorTable;
