# Multi-AZ VPC. Everything stateful (Postgres, Redis, Elasticsearch) and
# everything stateless (gateway, ehr-service, ai-service) is spread across
# at least 2 AZs so a single AZ outage doesn't take the network down.

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = { Name = "hospital-network-${var.environment}" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "public-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "private-${count.index}" }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# NAT so private-subnet services (gateway, EHR, AI service, databases) can
# reach the internet (e.g. the Anthropic API) without being publicly reachable.
resource "aws_nat_gateway" "main" {
  count         = 2
  subnet_id     = aws_subnet.public[count.index].id
  allocation_id = aws_eip.nat[count.index].id
}

resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
}
