# AWS VPC Isolation Architecture

For production deployment of LocalSampark, strict network isolation is required to prevent direct internet access to our databases (PostgreSQL and Redis).

## Architecture Layout

### 1. Public Subnets (DMZ)
- **Resources:** Application Load Balancers (ALB), NAT Gateways.
- **Access:** Direct Internet routing via Internet Gateway (IGW).
- **Security Group:** Allow INBOUND HTTPS (443) from 0.0.0.0/0.

### 2. Private Subnets (App Tier)
- **Resources:** Node.js Backend API instances (PM2 Cluster / Docker containers).
- **Access:** Outbound internet access via NAT Gateway (for third-party APIs like Stripe, Supabase).
- **Security Group:** Allow INBOUND HTTP/HTTPS ONLY from the ALB Security Group.

### 3. Isolated Subnets (Data Tier)
- **Resources:** Managed PostgreSQL (Amazon RDS), Redis (Amazon ElastiCache).
- **Access:** NO Internet Gateway, NO NAT Gateway. Totally isolated.
- **Security Group:**
  - PostgreSQL: Allow INBOUND TCP 5432 ONLY from the App Tier Security Group.
  - Redis: Allow INBOUND TCP 6379 ONLY from the App Tier Security Group.

## Bastion Host
To access the databases for administration/migrations:
1. Deploy a tiny EC2 instance (Bastion) in the Public Subnet.
2. Only allow SSH (Port 22) from authorized developer IPs.
3. SSH into the Bastion, and then connect to the Database endpoints.

This ensures zero-trust for the database layer.
