// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    struct Certificate {
        string studentID;
        address issuer;
        string certificateHash; // SHA-256 hash of certificate details
        bool isValid;
    }

    struct Verification {
        uint256 count; // Number of verification attempts
        address lastVerifier; // Last address to verify
        uint256 lastVerifiedTimestamp; // Last verification timestamp
    }

    mapping(string => Certificate) public certificates;
    mapping(string => Verification) public verifications;

    event CertificateIssued(string studentID, string certificateHash, address issuer);
    event CertificateRevoked(string studentID, address issuer);
    event CertificateVerified(string studentID, bool isValid, address verifier);

    // Issue a new certificate
    function issueCertificate(string memory _studentID, string memory _certificateHash) public {
        require(bytes(_studentID).length > 0, "Student ID cannot be empty");
        require(bytes(_certificateHash).length > 0, "Certificate hash cannot be empty");
        certificates[_studentID] = Certificate(_studentID, msg.sender, _certificateHash, true);
        emit CertificateIssued(_studentID, _certificateHash, msg.sender);
    }

    // Verify a certificate's authenticity (state-changing)
    function verifyCertificate(string memory _studentID, string memory _certificateHash) public returns (bool) {
        Certificate memory cert = certificates[_studentID];
        bool isValid = cert.isValid && keccak256(abi.encodePacked(_certificateHash)) == keccak256(abi.encodePacked(cert.certificateHash));
        
        // Update verification state
        verifications[_studentID].count += 1;
        verifications[_studentID].lastVerifier = msg.sender;
        verifications[_studentID].lastVerifiedTimestamp = block.timestamp;

        emit CertificateVerified(_studentID, isValid, msg.sender);
        return isValid;
    }

    // Revoke a certificate (only by issuer)
    function revokeCertificate(string memory _studentID) public {
        Certificate storage cert = certificates[_studentID];
        require(cert.issuer == msg.sender, "Only issuer can revoke");
        cert.isValid = false;
        emit CertificateRevoked(_studentID, msg.sender);
    }
}