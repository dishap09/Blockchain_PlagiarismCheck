// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AcademicPaperRegistry {
    struct Paper {
        string title;
        string contentHash;  // IPFS hash or other content hash
        string bucketHash;   // Hash representing the "bucket" for all versions of this paper
        address author;
        uint256 timestamp;
        uint256 versionCount;
        bool exists;
    }
    
    struct PaperVersion {
        string contentHash;
        uint256 timestamp;
        string description;
    }

    // Mapping from bucket hash to Paper struct
    mapping(string => Paper) public papers;
    
    // Mapping from bucket hash to array of paper versions
    mapping(string => PaperVersion[]) public paperVersions;
    
    // Mapping from title to bucket hash
    mapping(string => string) public titleToBucketHash;
    
    // Array of all bucket hashes
    string[] public allBucketHashes;
    
    // Mapping from user address to their bucket hashes
    mapping(address => string[]) public userPapers;

    event PaperRegistered(string bucketHash, string title, address author, uint256 timestamp);
    event VersionAdded(string bucketHash, string contentHash, uint256 versionNumber, uint256 timestamp);

    // Register a new paper
    function registerPaper(string memory _title, string memory _contentHash, string memory _bucketHash) public {
        // Check if title already exists
        require(bytes(titleToBucketHash[_title]).length == 0, "Paper with this title already exists");
        
        // Create new paper
        papers[_bucketHash] = Paper({
            title: _title,
            contentHash: _contentHash,
            bucketHash: _bucketHash,
            author: msg.sender,
            timestamp: block.timestamp,
            versionCount: 1,
            exists: true
        });
        
        // Add first version
        paperVersions[_bucketHash].push(PaperVersion({
            contentHash: _contentHash,
            timestamp: block.timestamp,
            description: "Initial version"
        }));
        
        // Update mappings
        titleToBucketHash[_title] = _bucketHash;
        allBucketHashes.push(_bucketHash);
        userPapers[msg.sender].push(_bucketHash);
        
        emit PaperRegistered(_bucketHash, _title, msg.sender, block.timestamp);
    }
    
    // Add new version to existing paper
    function addVersion(string memory _bucketHash, string memory _contentHash, string memory _description) public {
        require(papers[_bucketHash].exists, "Paper does not exist");
        require(papers[_bucketHash].author == msg.sender, "Only the author can add versions");
        
        paperVersions[_bucketHash].push(PaperVersion({
            contentHash: _contentHash,
            timestamp: block.timestamp,
            description: _description
        }));
        
        papers[_bucketHash].versionCount += 1;
        papers[_bucketHash].contentHash = _contentHash;  // Update to latest content hash
        
        emit VersionAdded(_bucketHash, _contentHash, papers[_bucketHash].versionCount, block.timestamp);
    }
    
    // Check if title exists
    function checkTitleExists(string memory _title) public view returns (bool, string memory, address) {
        string memory bucketHash = titleToBucketHash[_title];
        if (bytes(bucketHash).length > 0) {
            return (true, bucketHash, papers[bucketHash].author);
        }
        return (false, "", address(0));
    }
    
    // Get paper details
    function getPaper(string memory _bucketHash) public view returns (
        string memory title,
        string memory contentHash,
        address author,
        uint256 timestamp,
        uint256 versionCount
    ) {
        require(papers[_bucketHash].exists, "Paper does not exist");
        Paper storage paper = papers[_bucketHash];
        return (
            paper.title,
            paper.contentHash,
            paper.author,
            paper.timestamp,
            paper.versionCount
        );
    }
    
    // Get version details
    function getVersion(string memory _bucketHash, uint256 _versionIndex) public view returns (
        string memory contentHash,
        uint256 timestamp,
        string memory description
    ) {
        require(papers[_bucketHash].exists, "Paper does not exist");
        require(_versionIndex < papers[_bucketHash].versionCount, "Version does not exist");
        
        PaperVersion storage version = paperVersions[_bucketHash][_versionIndex];
        return (
            version.contentHash,
            version.timestamp,
            version.description
        );
    }
    
    // Get all papers by a user
    function getUserPapers(address _user) public view returns (string[] memory) {
        return userPapers[_user];
    }
    
    // Get total paper count
    function getPaperCount() public view returns (uint256) {
        return allBucketHashes.length;
    }
}