// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlagiarismChecker {
    struct CheckerState {
        uint256 checksRemaining;
        uint256 highSimilarityCount;
        bool isBanned;
    }
    
    // Mapping from author address to their check state
    mapping(address => CheckerState) public authorStates;
    
    // Event for when checks are performed
    event PlagiarismChecked(
        address indexed author,
        uint256 similarity,
        uint256 checksRemaining,
        bool isBanned
    );
    
    // Initialize with 3 checks for new authors
    function _initializeAuthor(address author) private {
        if (authorStates[author].checksRemaining == 0) {
            authorStates[author] = CheckerState({
                checksRemaining: 3,
                highSimilarityCount: 0,
                isBanned: false
            });
        }
    }
    
    // Record a plagiarism check
    function recordCheck(address author, uint256 similarity) external returns (bool allowed) {
        _initializeAuthor(author);
        CheckerState storage state = authorStates[author];
        
        require(!state.isBanned, "Author is banned from further checks");
        require(state.checksRemaining > 0, "No checks remaining");
        
        if (similarity > 30) {
            state.highSimilarityCount += 1;
            if (state.highSimilarityCount >= 3) {
                state.isBanned = true;
            }
        }
        
        state.checksRemaining -= 1;
        allowed = !state.isBanned && state.checksRemaining > 0;
        
        emit PlagiarismChecked(
            author,
            similarity,
            state.checksRemaining,
            state.isBanned
        );
        
        return allowed;
    }
    
    // Get author's check state
    function getAuthorState(address author) external view returns (
        uint256 checksRemaining,
        uint256 highSimilarityCount,
        bool isBanned
    ) {
        CheckerState storage state = authorStates[author];
        return (
            state.checksRemaining,
            state.highSimilarityCount,
            state.isBanned
        );
    }
}