// client/src/utils/web3Utils.js
import Web3 from 'web3';
import TruffleContract from '@truffle/contract';
import AcademicPaperRegistryABI from '../contracts/AcademicPaperRegistry.json';

export const initWeb3 = async () => {
  let web3;
  
  // Check if Web3 has been injected by MetaMask
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      console.error("User denied account access");
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
  }
  // Use Ganache if no web3 injection
  else {
    const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
    web3 = new Web3(provider);
  }
  
  return web3;
};

export const initContract = async (web3) => {
  const AcademicRegistry = TruffleContract(AcademicPaperRegistryABI);
  AcademicRegistry.setProvider(web3.currentProvider);
  return await AcademicRegistry.deployed();
};

export const getUserAccount = async (web3) => {
  const accounts = await web3.eth.getAccounts();
  return accounts[0];
};

// Function to generate bucket hash
export const generateBucketHash = (title, authorAddress) => {
  const web3 = new Web3();
  return web3.utils.soliditySha3(
    { type: 'string', value: title },
    { type: 'address', value: authorAddress }
  );
};

// Function to generate content hash
export const generateContentHash = (content) => {
  const web3 = new Web3();
  return web3.utils.soliditySha3({ type: 'string', value: content });
};