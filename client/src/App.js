import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import PlagiarismChecker from './contracts/PlagiarismChecker.json';

import Login from './components/Login';
import Navigation from './components/Navigation';
import PaperSubmission from './components/PaperSubmission';
import PaperList from './components/PaperList';

function App() {
  const [account, setAccount] = useState('');
  const [web3, setWeb3] = useState(null);
  const [plagiarismChecker, setPlagiarismChecker] = useState(null);


  const handleLogin = async (selectedAccount, web3Instance) => {
    setAccount(selectedAccount);
    setWeb3(web3Instance);
    
    // Get network ID and deployed contract address
    const networkId = await web3Instance.eth.net.getId();
    const deployedNetwork = PlagiarismChecker.networks[networkId];
    const plagiarismChecker = new web3Instance.eth.Contract(
        PlagiarismChecker.abi,
        deployedNetwork && deployedNetwork.address
    );
    
    // Store in state or context
    setPlagiarismChecker(plagiarismChecker);
};

  const handleLogout = () => {
    setAccount('');
    setWeb3(null);
  };

  const handleSubmitSuccess = () => {
    // You can add any additional logic after successful submission
    window.alert('Paper submitted successfully!');
    // Optionally redirect to papers list
    window.location.href = '/papers';
  };

  return (
    <Router>
      <div className="App">
        <Navigation account={account} onLogout={handleLogout} />
        
        <Routes>
          <Route path="/" element={
            account ? (
              <Navigate to="/papers" />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
          
          <Route path="/submit" element={
            account ? (
              <PaperSubmission 
                web3={web3} 
                account={account} 
                onSubmitSuccess={handleSubmitSuccess}
              />
            ) : (
              <Navigate to="/" />
            )
          } />
          
          <Route path="/papers" element={
            account ? (
              <PaperList web3={web3} account={account} />
            ) : (
              <Navigate to="/" />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;