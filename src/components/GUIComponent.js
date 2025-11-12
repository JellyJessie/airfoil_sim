import React from "react";

const Button = ({ label, onClick }) => (
  <button onClick={onClick} className="custom-button">
    {label}
  </button>
);

export default Button;
