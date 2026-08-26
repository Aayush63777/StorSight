# StorSight

## Storage Incident Root-Cause & Operations Intelligence Platform

StorSight is an independent portfolio project designed to demonstrate how a modern web-based platform can help IT operations teams monitor storage resources, manage operational incidents, correlate events, and generate explainable root-cause insights.

The project is inspired by real-world enterprise storage operations and is designed as a learning and portfolio project using Python, Flask, SQL, HTML, CSS, and JavaScript.

> **Disclaimer:** StorSight is an independent portfolio project. It is not an internal, proprietary, or official NetApp product.

---

## 1. Project Overview

Modern IT environments generate large amounts of infrastructure metrics, events, alerts, and operational incidents. Identifying the relationship between these signals and determining the likely root cause can be difficult when information is distributed across different systems.

StorSight aims to provide a centralized operational workspace where storage resources, infrastructure events, alerts, and incidents can be managed and analyzed through a unified interface.

The platform will focus on:

- Storage resource management
- Infrastructure monitoring concepts
- Event and alert management
- Incident management
- Event correlation
- Explainable root-cause analysis
- Risk scoring
- Operational recommendations
- Audit logging
- Responsive dashboards

---

## 2. Problem Statement

IT operations teams may receive multiple alerts from the same underlying infrastructure problem.

For example:

```text
Storage latency increases
        ↓
Application response time increases
        ↓
Multiple alerts are generated
        ↓
An incident is created
        ↓
Engineer investigates multiple signals


3. Objectives

The primary objectives of StorSight are to:

Provide a centralized storage operations dashboard.
Manage storage infrastructure resources.
Record infrastructure events and alerts.
Create and manage operational incidents.
Correlate related events with incidents.
Apply explainable rule-based root-cause analysis.
Calculate operational risk scores.
Provide troubleshooting recommendations.
Maintain an audit trail of important actions.
Provide a responsive web interface.
Demonstrate production-oriented Flask development practices.
4. Planned MVP Capabilities

The initial MVP is planned to include:

User authentication
Role-based access control
Storage resource management
Storage health overview
Event management
Alert management
Incident management
Incident timeline
Event-to-incident correlation
Rule-based root-cause analysis
Risk scoring
Recommendation engine
Operational dashboard
Audit logging
Responsive UI
REST API endpoints
Automated tests

Features listed above are planned capabilities unless explicitly marked as completed in the project status section.

5. Target Users

The initial platform is designed around the following roles:

Operations Engineer

Responsible for monitoring infrastructure, investigating alerts, and resolving incidents.

System Administrator

Responsible for managing infrastructure resources and operational configuration.

Operations Manager

Responsible for monitoring operational health, incident trends, and overall risk.

Platform Administrator

Responsible for users, roles, configuration, and audit information.

6. Core Workflow

The planned operational workflow is:

Infrastructure
      ↓
Metrics / Events
      ↓
Alerts
      ↓
Incident
      ↓
Event Correlation
      ↓
Root Cause Analysis
      ↓
Risk Score
      ↓
Recommendation
      ↓
Engineer Action
      ↓
Resolution
      ↓
Audit Trail

The objective is to provide a clear relationship between infrastructure signals and operational incidents.

7. Technology Stack
Backend
Python
Flask
Database
SQL-based relational database
SQLite for local development where appropriate
PostgreSQL planned for production deployment
Frontend
HTML5
CSS3
JavaScript
Development
VS Code
Git
GitHub
Python virtual environment
Testing
pytest
Deployment

The application will be designed to support deployment to a cloud hosting environment.

Containerization may be introduced as the project matures.

8. Planned Architecture

StorSight will initially follow a modular monolith architecture.

The planned architecture is:

Browser
   ↓
HTML / CSS / JavaScript
   ↓
Flask Routes / REST API
   ↓
Application Services
   ↓
Business Rules
   ↓
Data Access Layer
   ↓
SQL Database

Supporting components will include:

Authentication
Authorization
Validation
Logging
Audit Trail
Error Handling
Testing
Configuration Management

The architecture will remain intentionally simpler than a microservices architecture so that the MVP can be developed, tested, deployed, and understood efficiently.

9. Root-Cause Intelligence Approach

The initial root-cause intelligence engine will use explainable rule-based analysis rather than external AI or machine-learning services.

For example:

High latency
+
Storage capacity threshold exceeded
+
Recent storage event
        ↓
Potential capacity-related incident
        ↓
Risk Score
        ↓
Recommended Investigation

Each result should provide an explanation of why the rule was triggered.

This approach is intentionally chosen for the MVP because it is:

Explainable
Deterministic
Testable
Easy to debug
Easy to demonstrate in an interview

Machine-learning or external AI capabilities may be considered as future enhancements.

10. Security Approach

Security will be considered from the beginning of development.

Planned practices include:

Password hashing
Authentication
Role-based authorization
Environment-based secrets
CSRF protection where applicable
Input validation
Secure session configuration
SQL injection prevention through parameterized/database abstraction mechanisms
Error handling without exposing sensitive information
Audit logging
No secrets committed to Git

Actual security features will be implemented progressively during development.

11. Responsive UI Strategy

The interface will be designed for:

Mobile
   ↓
Tablet
   ↓
Desktop

Responsive design will be considered from the beginning rather than added after desktop development.

Planned UI principles include:

Responsive navigation
Mobile-friendly tables
Responsive dashboards
Accessible forms
Consistent spacing
Reusable UI components
Clear status indicators
Operationally focused layouts
12. Testing Strategy

The project will gradually introduce automated testing.

Planned testing areas include:

Unit Tests

Business rules and utility functions.

Integration Tests

Flask routes and database interactions.

Authentication Tests

Login, authorization, and access control.

API Tests

REST endpoint behavior and validation.

Regression Tests

Protection against previously fixed issues.

The goal is to ensure that important business logic can be tested independently from the user interface.

13. Deployment Strategy

The application will be designed for deployment from the beginning.

The planned deployment workflow is:

Local Development
       ↓
Git
       ↓
GitHub
       ↓
Automated Validation
       ↓
Production Deployment

Environment-specific configuration will be handled using environment variables.

Production secrets will never be committed to the Git repository.

PostgreSQL will be considered for production database deployment.

Containerization may be added later if it provides meaningful value.

14. Git / GitHub Development Workflow

Development will follow a controlled Git workflow.

Feature Planning
      ↓
Implementation
      ↓
Testing
      ↓
Git Status
      ↓
Commit
      ↓
GitHub

Commit messages should clearly describe the change.

Examples:

feat: add incident management
fix: validate incident severity
test: add incident service tests
docs: update deployment guide
chore: update dependencies

The GitHub repository will act as the primary source-control system for the project.

15. Local Development Overview

The project is intended to be developed in VS Code.

Typical setup:

git clone <repository-url>

cd storsight

python -m venv .venv

# Windows Git Bash
source .venv/Scripts/activate

pip install -r requirements.txt

Environment configuration will be based on .env.example.

The exact application startup command will be documented after the Flask application is implemented.

16. Project Status
Completed
Initial project repository created
Git repository initialized
GitHub remote configured
Initial project foundation files created
In Development
Project architecture
Database design
Flask application structure
Authentication
Core operational modules
Planned
Incident intelligence
Root-cause analysis
Risk scoring
Dashboard
REST APIs
Automated testing
Production deployment
17. Roadmap
Phase 0 — Repository Foundation
Repository setup
Documentation foundation
Environment configuration
Git workflow
Phase 1 — Technical Architecture
Application architecture
Database schema
Security model
API conventions
Phase 2 — Flask Foundation
Application factory
Configuration
Extensions
Error handling
Logging
Phase 3 — Authentication
User model
Login
Password security
Roles
Authorization
Phase 4 — Infrastructure Management
Storage resources
Health information
Resource dashboard
Phase 5 — Events and Alerts
Event management
Alert management
Event classification
Phase 6 — Incident Management
Incident lifecycle
Incident timeline
Event correlation
Phase 7 — Root-Cause Intelligence
Rule engine
Risk scoring
Recommendations
Phase 8 — Dashboard
Operational overview
Incident analytics
Health indicators
Phase 9 — Testing & Security
Unit tests
Integration tests
Security hardening
Validation
Phase 10 — Deployment
Production configuration
Database deployment
Cloud deployment
Documentation
18. Future Enhancements

Potential future capabilities include:

Advanced anomaly detection
Machine-learning-based analysis
External AI-assisted investigation
Real storage platform integrations
Automated remediation workflows
Notification integrations
Historical trend analysis
Predictive capacity analysis
Advanced observability integrations
Containerized deployment
Background job processing
Advanced reporting

These capabilities are intentionally outside the initial MVP scope.

19. Disclaimer

StorSight is an independent portfolio and learning project.

It is inspired by concepts commonly encountered in enterprise storage operations, infrastructure monitoring, incident management, and troubleshooting.

It is not an internal, proprietary, official, or affiliated NetApp product and does not contain proprietary NetApp source code, confidential information, or internal systems.

The project is intended to demonstrate software engineering, system design, backend development, database design, operational intelligence concepts, testing, and deployment skills.