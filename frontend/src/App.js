import React, { useState } from 'react';
import { ethers, sha256, toUtf8Bytes } from 'ethers';
import './App.css';

// Update with the correct contract address
const contractAddress = "0x48dB2dAC8466191A12cfF1697E44046ce7ea1251"; // Replace if redeployed
const contractABI = [
  {
    "inputs": [
      { "name": "_studentID", "type": "string" },
      { "name": "_certificateHash", "type": "string" }
    ],
    "name": "issueCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_studentID", "type": "string" },
      { "name": "_certificateHash", "type": "string" }
    ],
    "name": "verifyCertificate",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_studentID", "type": "string" }],
    "name": "revokeCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "", "type": "string" }],
    "name": "certificates",
    "outputs": [
      { "name": "studentID", "type": "string" },
      { "name": "issuer", "type": "address" },
      { "name": "certificateHash", "type": "string" },
      { "name": "isValid", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "", "type": "string" }],
    "name": "verifications",
    "outputs": [
      { "name": "count", "type": "uint256" },
      { "name": "lastVerifier", "type": "address" },
      { "name": "lastVerifiedTimestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "name": "studentID", "type": "string", "indexed": false },
      { "name": "certificateHash", "type": "string", "indexed": false },
      { "name": "issuer", "type": "address", "indexed": false }
    ],
    "name": "CertificateIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "name": "studentID", "type": "string", "indexed": false },
      { "name": "issuer", "type": "address", "indexed": false }
    ],
    "name": "CertificateRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "name": "studentID", "type": "string", "indexed": false },
      { "name": "isValid", "type": "bool", "indexed": false },
      { "name": "verifier", "type": "address", "indexed": false }
    ],
    "name": "CertificateVerified",
    "type": "event"
  }
];

function App() {
  const [studentID, setStudentID] = useState('');
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [account, setAccount] = useState(null);

  // Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
        alert("Failed to connect wallet.");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Generate SHA-256 hash
  const generateHash = () => {
    try {
      const certificateData = JSON.stringify({
        studentID,
        name,
        course,
        dateIssued: new Date().toISOString().split('T')[0]
      });
      const hash = sha256(toUtf8Bytes(certificateData));
      console.log("Generated hash:", hash);
      return hash;
    } catch (error) {
      console.error("Error generating hash:", error);
      return null;
    }
  };

  // Issue certificate (MetaMask transaction)
  const issueCertificate = async () => {
    if (!account) {
      alert("Please connect wallet!");
      return;
    }
    if (!studentID || !name || !course) {
      alert("Please fill all fields!");
      return;
    }
    try {
      const hash = generateHash();
      if (!hash) throw new Error("Hash generation failed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.issueCertificate(studentID, hash, { gasLimit: 200000 });
      await tx.wait();
      alert("Certificate issued successfully!");
    } catch (error) {
      console.error("Error issuing certificate:", error);
      let errorMessage = "Failed to issue certificate.";
      if (error.data && error.data.message) {
        errorMessage += ` Reason: ${error.data.message}`;
      } else if (error.message.includes("Student ID cannot be empty")) {
        errorMessage += " Student ID cannot be empty.";
      } else if (error.message.includes("Certificate hash cannot be empty")) {
        errorMessage += " Certificate hash cannot be empty.";
      } else if (error.message.includes("Internal JSON-RPC error")) {
        errorMessage += " Contract error. Check if the contract is deployed correctly.";
      } else {
        errorMessage += " Check console for details.";
      }
      alert(errorMessage);
    }
  };

  // Verify certificate (MetaMask transaction)
  const verifyCertificate = async () => {
    if (!account) {
      alert("Please connect wallet!");
      return;
    }
    if (!studentID || !name || !course) {
      alert("Please fill all fields!");
      return;
    }
    try {
      const hash = generateHash();
      if (!hash) throw new Error("Hash generation failed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.verifyCertificate(studentID, hash, { gasLimit: 200000 });
      const receipt = await tx.wait();
      // Parse logs for CertificateVerified event
      const event = receipt.logs
        .map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(e => e && e.name === "CertificateVerified");
      if (!event) throw new Error("CertificateVerified event not found");
      const isValid = event.args.isValid;
      console.log("Verification result:", isValid);
      setVerifyResult(isValid ? "Certificate is valid!" : "Certificate is invalid!");
    } catch (error) {
      console.error("Error verifying certificate:", error);
      setVerifyResult("Certificate is invalid!");
    }
  };

  // Revoke certificate (MetaMask transaction)
  const revokeCertificate = async () => {
    if (!account) {
      alert("Please connect wallet!");
      return;
    }
    if (!studentID) {
      alert("Please enter Student ID!");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.revokeCertificate(studentID, { gasLimit: 200000 });
      await tx.wait();
      alert("Certificate revoked successfully!");
    } catch (error) {
      console.error("Error revoking certificate:", error);
      alert("Failed to revoke certificate: " + error.message);
    }
  };

  return (
    <div className="App">
      <h1>Blockchain-Based Student Credentials</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <p className="connected-account">Connected: {account}</p>
      )}
      <div className="form-section">
        <h2>Issue Certificate</h2>
        <input
          type="text"
          placeholder="Student ID"
          value={studentID}
          onChange={(e) => setStudentID(e.target.value)}
        />
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Course"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <button onClick={issueCertificate}>Issue Certificate</button>
      </div>
      <div className="form-section">
        <h2>Verify Certificate</h2>
        <input
          type="text"
          placeholder="Student ID"
          value={studentID}
          onChange={(e) => setStudentID(e.target.value)}
        />
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Course"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <button onClick={verifyCertificate}>Verify Certificate</button>
        {verifyResult && <p>{verifyResult}</p>}
      </div>
      <div className="form-section">
        <h2>Revoke Certificate</h2>
        <input
          type="text"
          placeholder="Student ID"
          value={studentID}
          onChange={(e) => setStudentID(e.target.value)}
        />
        <button onClick={revokeCertificate}>Revoke Certificate</button>
      </div>
    </div>
  );
}

export default App;