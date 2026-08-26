# StorSight — Project Overview

## 1. Problem

Modern storage and infrastructure environments generate a large volume of operational signals, including metrics, events, alerts, warnings, and incidents.

A single underlying infrastructure problem can produce multiple symptoms.

For example:

```text
Storage capacity increases
        ↓
Performance degradation
        ↓
Application latency
        ↓
Multiple alerts
        ↓
Operational incident

2. Proposed Solution

StorSight will provide a web-based operational intelligence platform that organizes infrastructure information into a unified workflow.

The platform will allow authorized users to:

Manage storage resources.
Record infrastructure events.
Manage alerts.
Create and track incidents.
Correlate related operational signals.
Analyze possible root causes.
Calculate risk scores.
Generate explainable recommendations.
Track incident resolution.
Maintain an audit trail.

The initial root-cause analysis engine will use deterministic and explainable business rules rather than external AI or machine-learning services.

This keeps the MVP understandable, testable, and suitable for demonstration in a software engineering portfolio.

3. Target Users
Operations Engineer

Investigates alerts and incidents, analyzes operational signals, and performs remediation activities.

System Administrator

Manages infrastructure resources and operational configuration.

Operations Manager

Monitors incident trends, infrastructure health, and operational risk.

Platform Administrator

Manages users, roles, system configuration, and audit information.

4. Core Workflow

The primary operational workflow is:

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

The goal is to connect infrastructure signals with operational incidents and provide an explainable investigation path.

5. MVP Scope

The first working version should remain intentionally focused.

Authentication
User registration or controlled user provisioning
Login
Logout
Password security
Role-based authorization
Storage Resource Management
Create storage resources
View storage resources
Update storage resources
Monitor basic health information
Track capacity-related information
Events
Record infrastructure events
Classify events
Associate events with resources
View event history
Alerts
Create and manage alerts
Track alert severity
Associate alerts with infrastructure resources
Link alerts to incidents
Incident Management
Create incidents
Assign severity
Track incident status
Assign incidents to users
Maintain incident timeline
Resolve incidents
Event Correlation
Associate related events with incidents
Identify temporal relationships
Group operational signals
Provide an investigation timeline
Root-Cause Analysis

The MVP will use explainable rules such as:

IF
    resource health is degraded
AND
    related performance metric exceeds threshold
AND
    matching event occurred recently
THEN
    identify a potential root-cause category

Each analysis result should explain which signals and rules contributed to the result.

Risk Scoring

The platform will calculate a simple operational risk score based on factors such as:

Severity
Resource health
Event frequency
Alert frequency
Incident age
Business impact

The initial scoring model will remain deterministic and explainable.

Recommendations

The system may provide investigation recommendations based on the detected condition.

Recommendations should explain the reason behind the suggested action.

Dashboard

The MVP dashboard should provide an operational overview including:

Resource health
Open incidents
Active alerts
Recent events
Risk indicators
Incident trends
Audit Trail

Important actions should be recorded for accountability and troubleshooting.

6. Explicitly Excluded From MVP

The following capabilities are intentionally excluded from the initial MVP:

Direct integration with production storage systems
Real production infrastructure monitoring
Kubernetes orchestration
Microservices architecture
Distributed message brokers
Complex event-streaming infrastructure
External AI APIs
Machine-learning infrastructure
Autonomous remediation
Production-scale multi-region architecture

These capabilities may be considered in future versions if they provide meaningful value.

7. Technical Direction

StorSight will initially use a modular monolith architecture.

The planned logical structure is:

Web Browser
     ↓
Flask Web Layer / REST API
     ↓
Application Services
     ↓
Business Rules
     ↓
Data Access
     ↓
SQL Database

Supporting concerns will include:

Authentication
Authorization
Validation
Configuration
Logging
Audit Logging
Error Handling
Testing

The architecture should remain simple enough for a single developer to understand and maintain while still demonstrating professional software engineering practices.

8. Database Direction

The application will use a relational SQL database.

Local development can begin with SQLite for simplicity.

The application should be designed so that PostgreSQL can be used for production deployment without requiring major changes to business logic.

Potential core entities include:

User
Role
Storage Resource
Metric
Event
Alert
Incident
Incident Event
Root Cause Analysis
Recommendation
Audit Log

The final schema will be defined during the technical architecture and database design phase.

9. Security Direction

Security will be considered throughout development.

Planned practices include:

Secure password hashing
Authentication
Role-based authorization
Environment-based secrets
Input validation
Secure session configuration
CSRF protection where applicable
SQL injection prevention
Controlled error responses
Audit logging
No secrets in source control

Security requirements will be implemented progressively rather than attempting to build every security feature during the repository foundation phase.

10. Responsive UI Direction

StorSight will be designed as a responsive web application.

The interface should work across:

Mobile
   ↓
Tablet
   ↓
Desktop

Responsive behavior will be considered during initial UI implementation rather than added after the desktop interface is completed.

Important UI areas include:

Navigation
Dashboard
Resource tables
Incident details
Event timelines
Forms
Alerts
Risk indicators
11. Testing Direction

Testing will be introduced alongside application functionality.

Planned testing areas include:

Unit Testing

Business rules, risk scoring, root-cause rules, and utility functions.

Integration Testing

Database operations and Flask application workflows.

API Testing

REST endpoint behavior, validation, authentication, and authorization.

Regression Testing

Previously fixed defects should receive automated coverage where appropriate.

The goal is to keep core business logic independently testable.

12. Deployment Direction

The application will be designed for deployment from the beginning.

Planned deployment flow:

Local Development
       ↓
Git
       ↓
GitHub
       ↓
Automated Testing
       ↓
Production Deployment

Configuration will be environment-based.

Production secrets will not be stored in GitHub.

The production database is expected to use PostgreSQL.

Cloud deployment and containerization will be introduced after the application reaches a stable MVP state.

13. Future Scope

Potential future enhancements include:

Advanced Analytics
Historical trend analysis
Capacity forecasting
Incident trend analysis
Advanced operational dashboards
Intelligent Detection
Anomaly detection
Statistical analysis
Machine-learning-assisted root-cause analysis
Integrations
Storage platform APIs
Monitoring platforms
Notification systems
Incident management systems
Automation
Automated remediation workflows
Scheduled operational checks
Background processing
Notification automation
Platform Improvements
Containerized deployment
Background job processing
Advanced reporting
Multi-tenant capabilities
More sophisticated authorization

These features are outside the initial MVP.

14. Success Criteria

The MVP will be considered successful when the following goals are achieved:

The application runs reliably in a local development environment.
Users can authenticate securely.
Authorized users can manage storage resources.
Infrastructure events can be recorded and associated with resources.
Alerts can be created and managed.
Incidents can be created, assigned, tracked, and resolved.
Events and alerts can be correlated with incidents.
Root-cause rules produce explainable results.
Risk scores are calculated consistently.
Recommendations are generated from defined operational rules.
The dashboard provides a useful operational overview.
Important actions are recorded in an audit trail.
Automated tests cover important business logic.
The application works across mobile, tablet, and desktop layouts.
The application can be deployed to a production environment using environment-based configuration.
15. Project Boundaries

StorSight is intentionally designed as an independent portfolio project.

It does not attempt to reproduce a proprietary enterprise storage management platform.

The project focuses on demonstrating:

Backend development
Flask architecture
SQL database design
REST API development
Business-rule implementation
Incident management
Root-cause analysis
Security practices
Testing
Responsive frontend development
Git/GitHub workflow
Deployment practices
16. Project Status
Completed
Local Git repository initialized
GitHub repository created
GitHub remote configured
Initial repository documentation structure created
In Progress
Repository foundation
Product definition
Technical architecture
Planned
Flask application foundation
Database implementation
Authentication
Storage resource management
Event management
Alert management
Incident management
Root-cause analysis
Risk scoring
Dashboard
Testing
Deployment