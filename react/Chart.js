import React from "react";
import { Line } from "react-chartjs-2";

const FoilPlot = ({ data }) => {
  const chartData = {
    labels: data.x,
    datasets: [
      {
        label: "Lift",
        data: data.y,
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
      },
    ],
  };

  return <Line data={chartData} />;
};

export default FoilPlot;
