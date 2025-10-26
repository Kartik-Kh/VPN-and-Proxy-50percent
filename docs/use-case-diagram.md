# Use Case Diagram - VPN and Proxy Detector

```mermaid
graph TB
    %% Actors
    Analyst((Analyst User))
    Admin((System Administrator))
    
    %% System Boundary
    subgraph System["VPN Detector System Boundaries"]
        %% Use Cases
        UC1[Register / Login<br/>NFR-002]
        UC2[Submit Single IP Lookup]
        UC3[Upload Bulk CSV<br/>FR-006]
        UC4[View Lookups History<br/>FR-007]
        UC5[Export Audit Reports<br/>FR-007]
        UC6[Update Threat Feeds]
        UC7[Monitor System Status<br/>NFR-001]
    end
    
    %% Analyst User connections
    Analyst --> UC1
    Analyst --> UC2
    Analyst --> UC3
    Analyst --> UC4
    Analyst --> UC5
    
    %% System Administrator connections
    Admin --> UC1
    Admin --> UC6
    Admin --> UC7
    Admin --> UC5
    
    %% Include relationships
    UC2 -.->|includes| UC1
    UC3 -.->|includes| UC1
    UC4 -.->|includes| UC1
    UC5 -.->|includes| UC1
    UC6 -.->|includes| UC1
    UC7 -.->|includes| UC1
    
    %% Styling
    classDef actor fill:#FFE4B5,stroke:#000,stroke-width:2px
    classDef usecase fill:#87CEEB,stroke:#000,stroke-width:2px
    classDef boundary fill:#F0F0F0,stroke:#000,stroke-width:3px
    
    class Analyst,Admin actor
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7 usecase
    class System boundary
```

---

## Actors

### 1. Analyst User
**Primary investigator performing IP/domain analysis**
- **Role**: Front-line user conducting threat detection
- **Permissions**: Standard user access (analyst role)
- **Primary Use Cases**:
  - Register/Login (NFR-002: Authentication)
  - Submit Single IP Lookup
  - Upload Bulk CSV (FR-006: Batch processing)
  - View Lookups History (FR-007: Audit trail)
  - Export Audit Reports (FR-007: Compliance)

### 2. System Administrator
**Technical staff managing platform operations**
- **Role**: System maintenance and monitoring
- **Permissions**: Admin role with elevated access
- **Primary Use Cases**:
  - Register/Login (NFR-002: Authentication)
  - Update Threat Feeds (IP intelligence updates)
  - Monitor System Status (NFR-001: <150ms performance)
  - Export Audit Reports (FR-007: System auditing)

---

## Use Cases

| Use Case | Description | Requirements |
|----------|-------------|--------------|
| **Register / Login** | User authentication with JWT tokens | NFR-002 (bcrypt hashing) |
| **Submit Single IP Lookup** | Real-time IP/domain detection | NFR-001 (<150ms warm cache) |
| **Upload Bulk CSV** | Async batch processing via Socket.io | FR-006 (progress tracking) |
| **View Lookups History** | Browse audit trail with filters | FR-007 (MongoDB persistence) |
| **Export Audit Reports** | Download CSV/JSON compliance reports | FR-007 (audit logs) |
| **Update Threat Feeds** | Admin updates to VPN range data | Admin-only operation |
| **Monitor System Status** | Real-time dashboard (uptime, latency) | NFR-001 (performance monitoring) |

---

## Use Case Relationships

- **Include**: All use cases require **Register/Login** (shown with dotted arrows)
- **Actor Overlap**: Both actors can Export Audit Reports and must authenticate
- **Role Separation**: Only Admins can Update Threat Feeds and Monitor System Status
