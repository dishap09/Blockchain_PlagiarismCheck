// client/src/components/Navigation.js
import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Navigation({ account, onLogout }) {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Academic Publishing System</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/submit">Submit Paper</Nav.Link>
            <Nav.Link as={Link} to="/papers">My Papers</Nav.Link>
          </Nav>
          <Nav>
            {account ? (
              <>
                <Navbar.Text className="me-3">
                  Logged in as: <span className="text-light">{account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
                </Navbar.Text>
                <Nav.Link onClick={onLogout}>Logout</Nav.Link>
              </>
            ) : (
              <Nav.Link as={Link} to="/">Login</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigation;