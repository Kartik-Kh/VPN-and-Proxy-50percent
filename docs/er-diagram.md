# Entity-Relationship Diagram (VPN Detector)

## Chen Notation - Traditional E-R Diagram

```mermaid
graph TB
    %% Entities (Rectangles)
    User[USER]
    BulkJobs[BULK_JOBS]
    Lookups[LOOKUPS]
    IPCache[IP_CACHE]
    
    %% Relationships (Diamonds)
    R1{performs}
    R2{creates}
    R3{generates}
    R4{consults}
    
    %% Entity to Relationship connections with cardinality
    User ---|1| R1
    R1 ---|M| Lookups
    
    User ---|1| R2
    R2 ---|M| BulkJobs
    
    BulkJobs ---|1| R3
    R3 ---|M| Lookups
    
    Lookups ---|M| R4
    R4 ---|1| IPCache
    
    %% Styling
    classDef entityStyle fill:#87CEEB,stroke:#000,stroke-width:3px,color:#000
    classDef relationshipStyle fill:#FFD700,stroke:#000,stroke-width:2px,color:#000
    
    class User,BulkJobs,Lookups,IPCache entityStyle
    class R1,R2,R3,R4 relationshipStyle
```

---

## E-R Diagram Components

### Entities (Rectangles):
- **USER** - Registered users with authentication (NFR-002)
- **BULK_JOBS** - CSV batch processing jobs (FR-006)
- **LOOKUPS** - Audit trail of all IP detections (FR-007)
- **IP_CACHE** - Redis cache for fast lookups (NFR-001 <150ms)

### Relationships (Diamonds):
- **performs** - USER creates individual IP lookups
- **creates** - USER initiates bulk processing jobs
- **generates** - BULK_JOBS produce multiple lookup records
- **consults** - LOOKUPS query cached IP data

### Cardinality:
- **1:M** (One-to-Many) relationships between all entities
- One user → Many lookups
- One user → Many bulk jobs
- One bulk job → Many lookups
- Many lookups → One cached IP

---

## Database Implementation Notes:
- **USER**: Stores JWT tokens, bcrypt hashed passwords, role-based access
- **BULK_JOBS**: Tracks async job status (queued/processing/complete)
- **LOOKUPS**: Contains verdict, confidence score, WHOIS JSON data
- **IP_CACHE**: TTL-based expiration for warm cache performance
