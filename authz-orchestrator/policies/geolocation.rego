package authz.geolocation

import rego.v1

# Geolocation-based access control
default geolocation_allow := true

# Check if user's location is allowed
geolocation_allow if {
    # If no geo restrictions are configured, allow
    not input.tenant_config.geo_restrictions
}

geolocation_allow if {
    # Check if user's country is in allowed list
    input.tenant_config.geo_restrictions.allowed_countries
    input.context.request.country in input.tenant_config.geo_restrictions.allowed_countries
}

geolocation_allow if {
    # Check if user is in allowed regions/cities
    input.tenant_config.geo_restrictions.allowed_regions
    some region in input.tenant_config.geo_restrictions.allowed_regions
    startswith(input.context.request.location, region)
}

# Special override for VPN/corporate networks
geolocation_allow if {
    input.tenant_config.geo_restrictions.trusted_networks
    some network in input.tenant_config.geo_restrictions.trusted_networks
    net.cidr_contains(network, input.context.request.ip)
}

# Generate reasons for denial
geolocation_reasons := reasons if {
    not geolocation_allow
    reasons := ["geographic_restriction_violation"]
} else := []

# Risk escalation based on suspicious location
geolocation_risk_escalation := 2 if {
    # Escalate AAL if accessing from high-risk country
    input.tenant_config.geo_restrictions.high_risk_countries
    input.context.request.country in input.tenant_config.geo_restrictions.high_risk_countries
} else := 0