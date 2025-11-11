// As modules (best):
import "./FoilSimStudent_Calc.js";
import "./StudentGUIComponents.js";
import "./drawShape.js";
import "./shapeCalc.js";

// If they define globals and you need them on window:
// import * as Calc from './FoilSimStudent_Calc.js';
// (window as any).FoilSimCalc = Calc;
import * as Calc from "./FoilSimStudent_Calc.js";
(window as any).FoilSimCalc = Calc;
