# SIP Failure Troubleshooting Guide

## Overview
This runbook covers common SIP (Session Initiation Protocol) failures in Unified Communications environments.

## Common Error Codes

### SIP 408 - Request Timeout
**Symptoms**: Call setup fails with timeout, one-way audio, no ring-back tone
**Root Causes**:
- Network connectivity issues between endpoints
- Firewall blocking SIP signaling (ports 5060/5061)
- DNS resolution failures
- Overloaded SIP proxy

**Resolution Steps**:
1. Verify network connectivity between SIP endpoints using ping and traceroute
2. Check firewall rules for SIP ports (UDP/TCP 5060, TLS 5061)
3. Validate DNS records for SIP domain (SRV records)
4. Check SIP proxy CPU and memory utilization
5. Review SIP trunk registration status
6. Capture SIP traces for detailed analysis

### SIP 503 - Service Unavailable
**Symptoms**: Calls fail immediately, no dial tone
**Root Causes**:
- SIP server overloaded
- Backend services unavailable
- License exhaustion
- Database connection failures

**Resolution Steps**:
1. Check SIP server health and resource utilization
2. Verify all dependent services are running
3. Review license usage against capacity
4. Check database connectivity and performance
5. Restart affected services if necessary
6. Scale up resources if load is consistent

### SIP 486 - Busy Here
**Symptoms**: Call rejected, busy tone
**Root Causes**:
- User on another call (DND enabled)
- Maximum simultaneous calls reached
- Call forwarding loop

**Resolution Steps**:
1. Check user's current call status
2. Verify DND settings
3. Review call forwarding rules for loops
4. Check concurrent call limits

## One-Way Audio Issues
**Symptoms**: Audio flows in only one direction
**Root Causes**:
- NAT traversal issues
- RTP port blocking
- Codec mismatch
- Incorrect media routing

**Resolution Steps**:
1. Verify NAT configuration and STUN/TURN servers
2. Check RTP port ranges (typically 16384-32767)
3. Confirm codec negotiation in SIP INVITE/200 OK
4. Review media routing paths
5. Enable ICE if supported

## Registration Failures
**Symptoms**: Phones show unregistered, cannot make/receive calls
**Root Causes**:
- Authentication failures
- Certificate issues (for TLS)
- Network connectivity
- SIP registrar overload

**Resolution Steps**:
1. Verify credentials are correct
2. Check certificate validity and trust chain
3. Test network path to registrar
4. Review registrar logs for specific errors
5. Check registration expiry intervals
