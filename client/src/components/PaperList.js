// client/src/components/PaperList.js
import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { initContract, generateContentHash } from '../utils/web3Utils';
import { getPaperContent, addPaperVersion } from '../utils/apiService';

function PaperList({ web3, account }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [newVersion, setNewVersion] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewPaper, setViewPaper] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    const loadPapers = async () => {
      try {
        setLoading(true);
        const contract = await initContract(web3);
        const bucketHashes = await contract.getUserPapers(account);
        
        const paperPromises = bucketHashes.map(async (bucketHash) => {
          const paperDetails = await contract.getPaper(bucketHash);
          return {
            bucketHash,
            title: paperDetails.title,
            contentHash: paperDetails.contentHash,
            timestamp: new Date(paperDetails.timestamp * 1000).toLocaleString(),
            versionCount: paperDetails.versionCount.toNumber()
          };
        });
        
        const paperData = await Promise.all(paperPromises);
        setPapers(paperData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading papers:', error);
        setError('Failed to load papers. Please try again.');
        setLoading(false);
      }
    };
    
    if (web3 && account) {
      loadPapers();
    }
  }, [web3, account]);

  const handleViewPaper = async (bucketHash) => {
    try {
      const paperContent = await getPaperContent(bucketHash);
      setViewPaper(paperContent);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching paper content:', error);
      setError('Failed to fetch paper content. Please try again.');
    }
  };

  const handleAddVersion = async (paper) => {
    setSelectedPaper(paper);
    try {
      const paperContent = await getPaperContent(paper.bucketHash);
      setNewVersion(paperContent.content);
      setVersionDescription(`Version ${paper.versionCount + 1}`);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching paper content:', error);
      setError('Failed to fetch paper content. Please try again.');
    }
  };

  const handleSubmitVersion = async () => {
    if (!newVersion || !versionDescription) {
      setError('Please provide both content and description');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const contract = await initContract(web3);
      const contentHash = generateContentHash(newVersion);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Add version on blockchain
      await contract.addVersion(
        selectedPaper.bucketHash, 
        contentHash, 
        versionDescription, 
        { from: account }
      );
      
      // Add version in backend
      await addPaperVersion(
        selectedPaper.bucketHash,
        newVersion,
        timestamp
      );
      
      setSubmitting(false);
      setShowModal(false);
      
      // Refresh papers list
      const updatedPaperDetails = await contract.getPaper(selectedPaper.bucketHash);
      
      setPapers(papers.map(paper => 
        paper.bucketHash === selectedPaper.bucketHash ? {
          ...paper,
          contentHash: updatedPaperDetails.contentHash,
          versionCount: updatedPaperDetails.versionCount.toNumber()
        } : paper
      ));
      
    } catch (error) {
      console.error('Error adding version:', error);
      setError('Failed to add version. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Container className="mt-4">
      <h2>My Papers</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center mt-4">
          <Spinner animation="border" />
          <p>Loading your papers...</p>
        </div>
      ) : papers.length === 0 ? (
        <Alert variant="info">
          You haven't submitted any papers yet. Go to "Submit Paper" to add your first paper.
        </Alert>
      ) : (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Title</th>
              <th>Submission Date</th>
              <th>Versions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => (
              <tr key={paper.bucketHash}>
                <td>{paper.title}</td>
                <td>{paper.timestamp}</td>
                <td>{paper.versionCount}</td>
                <td>
                  <Button 
                    variant="info" 
                    size="sm" 
                    className="me-2"
                    onClick={() => handleViewPaper(paper.bucketHash)}
                  >
                    View
                  </Button>
                  <Button 
                    variant="success" 
                    size="sm"
                    onClick={() => handleAddVersion(paper)}
                  >
                    Add Version
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      {/* Add Version Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Version - {selectedPaper?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Version Description</Form.Label>
              <Form.Control
                type="text"
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder="e.g., Added methodology section"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Paper Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={15}
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitVersion}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" /> Submitting...
              </>
            ) : (
              'Submit New Version'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* View Paper Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{viewPaper?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <strong>Author:</strong> {viewPaper?.author_address}
          </div>
          <div className="mb-3">
            <strong>Content:</strong>
            <div className="border p-3 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
              {viewPaper?.content}
            </div>
          </div>
          <div className="mt-4">
            <h5>Previous Versions</h5>
            {viewPaper?.versions.length > 1 ? (
              viewPaper.versions.slice(0, -1).map((version, index) => (
                <div key={index} className="border p-3 mt-2">
                  <strong>Version {index + 1}</strong> - {new Date(version.timestamp * 1000).toLocaleString()}
                  <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {version.content}
                  </div>
                </div>
              ))
            ) : (
              <p>This is the first version of the paper.</p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PaperList;