import React from 'react';
import { Card, ProgressBar, Alert } from 'react-bootstrap';

const PlagiarismStatus = ({ checksRemaining, highSimilarityCount, isBanned }) => {
    if (isBanned) {
        return (
            <Alert variant="danger" className="mt-3">
                <Alert.Heading>Account Restricted</Alert.Heading>
                <p>
                    Your account has been restricted due to multiple high-similarity submissions.
                    Please contact support if you believe this is an error.
                </p>
            </Alert>
        );
    }

    return (
        <Card className="mt-3 shadow-sm">
            <Card.Body>
                <Card.Title>Plagiarism Check Status</Card.Title>
                <div className="mb-3">
                    <span>Checks Remaining: {checksRemaining}</span>
                    <ProgressBar 
                        now={(checksRemaining / 3) * 100} 
                        variant={checksRemaining > 1 ? "success" : "warning"} 
                        className="mt-2"
                    />
                </div>
                <div>
                    <span>High Similarity Count: {highSimilarityCount}/3</span>
                    <ProgressBar 
                        now={(highSimilarityCount / 3) * 100} 
                        variant={highSimilarityCount < 2 ? "info" : "danger"} 
                        className="mt-2"
                    />
                </div>
                {checksRemaining === 1 && (
                    <Alert variant="warning" className="mt-3">
                        Warning: You have only 1 check remaining. Use it wisely!
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};

export default PlagiarismStatus;