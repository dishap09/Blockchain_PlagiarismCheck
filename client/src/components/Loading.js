import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loading = ({ message = "Loading..." }) => {
    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <div className="text-center">
                <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="mt-3 text-muted">{message}</p>
            </div>
        </div>
    );
};

export default Loading;