/** StorSight TypeScript models — derived from Flask API serializers. */

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string | null; // role name string, e.g. "ENGINEER"
}

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  role_id: number;
}

export interface StorageResource {
  id: number;
  name: string;
  resource_type: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  capacity_total: number | null;
  capacity_used: number | null;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: number;
  resource_id: number;
  metric_name: string;
  metric_value: number;
  unit: string | null;
  recorded_at: string;
}

/** Event severities: info | warning | error | critical */
export interface Event {
  id: number;
  resource_id: number;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  occurred_at: string;
}

/** Alert severities: info | warning | critical */
export interface Alert {
  id: number;
  resource_id: number;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved';
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** Incident severities: low | medium | high | critical */
export interface Incident {
  id: number;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface IncidentEvent {
  id: number;
  incident_id: number;
  event_id: number;
  relationship_type: string;
  created_at: string;
}

export interface RootCauseAnalysis {
  id: number;
  incident_id: number;
  root_cause_category: string;
  confidence_score: number; // 0.0 – 1.0
  explanation: string;
  rule_name: string;
  created_at: string;
}

export interface RiskFactors {
  incident_severity: string;
  base_score: number;
  event_contribution: number;
  alert_contribution: number;
  correlated_event_count: number;
  active_alert_count: number;
}

/** Risk classifications: low | medium | high | critical */
export interface RiskScore {
  incident_id: number;
  score: number; // 0 – 100
  classification: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactors;
}

/** Recommendation priorities: low | medium | high | critical */
export interface Recommendation {
  id: number;
  incident_id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string | null;
  created_at: string;
}

/** Engineer action types: investigation | diagnosis | remediation |
 *  escalation | monitoring | note */
export interface EngineerAction {
  id: number;
  incident_id: number;
  user_id: number;
  action_type: string;
  description: string;
  recommendation_id: number | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export interface ApiError {
  error: string;
}

export interface LoginResponse {
  message: string;
  user: User;
}
