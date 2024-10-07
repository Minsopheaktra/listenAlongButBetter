import React from "react";
import { createRoot } from 'react-dom/client';
import HomePage from './HomePage';

// Fuction based Component //
function App(props) {
    return (
        <div className="center">
            <HomePage />
        </div>
    );
}
export default App;

// This is to render the App Function into index.html where div ID is app //
const appDiv = document.getElementById("app");
const root = createRoot(appDiv); // createRoot(container!) if you use TypeScript
root.render(<App />);