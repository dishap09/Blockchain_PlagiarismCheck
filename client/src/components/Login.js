// client/src/components/Login.js
import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { initWeb3 } from '../utils/web3Utils';

function Login({ onLogin }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnectWallet = async () => {
    setError('');
    setLoading(true);
    try {
      const web3 = await initWeb3();
      const accs = await web3.eth.getAccounts();
      
      if (accs.length === 0) {
        setError('No accounts found. Please unlock MetaMask.');
        setLoading(false);
        return;
      }

      setAccounts(accs);
      setSelectedAccount(accs[0]);
      setLoading(false);
    } catch (err) {
      console.error('MetaMask error:', err);
      setError('MetaMask connection failed or was cancelled.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    try {
      const web3 = await initWeb3(); // reuse the same call, since MetaMask was already connected
      onLogin(selectedAccount, web3);
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    }
  };

  return (
    <Container className="mt-5">
      <h2 className="mb-4">Login to Plagiarism-Proof Academic Publishing System</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {accounts.length === 0 ? (
        <Button onClick={handleConnectWallet} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect MetaMask Wallet'}
        </Button>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Select Account</Form.Label>
            <Form.Control
              as="select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="">Select an account</option>
              {accounts.map((account, index) => (
                <option key={index} value={account}>
                  {account}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Button variant="primary" type="submit" disabled={!selectedAccount}>
            Login
          </Button>
        </Form>
      )}
    </Container>
  );
}

export default Login;
