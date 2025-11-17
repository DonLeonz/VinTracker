import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import UIkit
import UIkit from 'uikit';
import Icons from 'uikit/dist/js/uikit-icons';
import 'uikit/dist/css/uikit.min.css';

// Import custom styles (centralized)
import './styles/index.css';

// Initialize UIkit icons
UIkit.use(Icons);

// Make UIkit available globally
window.UIkit = UIkit;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
