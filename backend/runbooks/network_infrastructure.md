# Network Infrastructure Troubleshooting Guide

## Overview
This runbook covers network infrastructure issues affecting UC/CC platforms including connectivity, QoS, and performance problems.

## Connectivity Issues

### Total Network Outage
**Symptoms**: All services unreachable, complete loss of connectivity
**Root Causes**:
- Core switch/router failure
- Fiber cut or WAN link down
- Power failure
- Configuration error pushed

**Resolution Steps**:
1. Verify physical infrastructure (power, cables)
2. Check core network device status
3. Contact ISP for WAN link status
4. Review recent configuration changes
5. Activate redundant paths if available
6. Initiate failover to DR site if necessary

### Intermittent Connectivity
**Symptoms**: Sporadic packet loss, connection drops
**Root Causes**:
- Flapping interface
- Spanning tree instability
- Overloaded links
- Hardware degradation

**Resolution Steps**:
1. Check interface error counters
2. Review spanning tree topology
3. Monitor link utilization
4. Inspect cables and SFPs
5. Check for duplicate IP addresses
6. Review ARP tables for anomalies

## Voice Quality Issues

### Audio Latency/Delay
**Symptoms**: Echo, noticeable delay in conversation
**Root Causes**:
- Network congestion
- QoS not configured/enforced
- Suboptimal routing path
- Jitter buffer misconfiguration

**Resolution Steps**:
1. Measure end-to-end latency (target <150ms)
2. Verify QoS markings (DSCP 46 for voice)
3. Check queue statistics on routers
4. Review routing tables for optimal path
5. Adjust jitter buffer settings
6. Consider dedicated voice VLAN

### Jitter Issues
**Symptoms**: Choppy audio, robotic voice
**Root Causes**:
- Variable queuing delays
- Competing traffic
- WAN link congestion
- Improper QoS prioritization

**Resolution Steps**:
1. Measure jitter (target <30ms)
2. Implement traffic shaping
3. Configure strict priority queuing for voice
4. Enable WRED for TCP traffic
5. Increase bandwidth if consistently high

### Packet Loss
**Symptoms**: Gaps in audio, missing words
**Root Causes**:
- Buffer overflow
- Interface errors
- Transmission errors
- Congestion drops

**Resolution Steps**:
1. Check interface counters for drops
2. Review queue depths
3. Monitor CRC errors
4. Implement traffic policing
5. Consider link aggregation

## DNS Issues

### DNS Resolution Failures
**Symptoms**: Services unreachable by name, SIP registration failures
**Root Causes**:
- DNS server down
- Zone transfer failure
- Cache poisoning
- Misconfigured records

**Resolution Steps**:
1. Test DNS server reachability
2. Verify zone records are current
3. Check DNS cache on clients
4. Validate SRV records for SIP
5. Review DNS logs for errors
6. Check recursive resolver configuration

## DHCP Issues

### IP Address Exhaustion
**Symptoms**: New devices cannot obtain IP, DHCP failures
**Root Causes**:
- Scope depleted
- Lease time too long
- Rogue DHCP server
- Scope misconfiguration

**Resolution Steps**:
1. Check available addresses in scope
2. Reduce lease time if appropriate
3. Scan for rogue DHCP servers
4. Expand scope or create additional scopes
5. Implement DHCP snooping

## Firewall/Security Issues

### Legitimate Traffic Blocked
**Symptoms**: Services unreachable despite network connectivity
**Root Causes**:
- ACL/firewall rule blocking traffic
- IPS false positive
- DDoS mitigation active
- Certificate/authentication failure

**Resolution Steps**:
1. Review firewall logs for denied traffic
2. Check IPS event logs
3. Verify traffic flow through security devices
4. Test with temporary rule bypass
5. Update IPS signatures if false positive
