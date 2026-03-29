# Contact Center Troubleshooting Guide

## Overview
This runbook covers common issues in Contact Center (CC) environments including call routing, agent connectivity, and queue management.

## Agent Login/State Issues

### Agent Cannot Log In
**Symptoms**: Agent unable to log into contact center application
**Root Causes**:
- Active Directory/LDAP authentication failure
- Agent profile not configured
- License not assigned
- CTI server connectivity issues

**Resolution Steps**:
1. Verify agent credentials in AD/LDAP
2. Check agent profile exists in CC admin console
3. Confirm license allocation for the agent
4. Test CTI server connectivity
5. Review agent desktop application logs
6. Clear browser cache/cookies if web-based
7. Check for concurrent login restrictions

### Agent Stuck in Wrong State
**Symptoms**: Agent shows wrong state (e.g., stuck in "Not Ready")
**Root Causes**:
- State synchronization failure
- Database inconsistency
- CTI message queue backup

**Resolution Steps**:
1. Force agent logout from admin console
2. Clear agent state in database
3. Restart agent desktop application
4. Check CTI server message queue
5. Review state change audit logs

## Call Routing Issues

### Calls Not Routing to Queue
**Symptoms**: Incoming calls not reaching expected queue
**Root Causes**:
- Routing script errors
- Queue not active/after hours
- DNIS/ANI mismatch
- IVR breakout issues

**Resolution Steps**:
1. Review routing script logic and conditions
2. Verify queue schedule and operating hours
3. Check DNIS mapping configuration
4. Test IVR menu paths
5. Review call flow logs for decision points
6. Validate skill group assignments

### Long Queue Times
**Symptoms**: Customers waiting excessively in queue
**Root Causes**:
- Insufficient agent staffing
- Skills mismatch
- Uneven call distribution
- System performance issues

**Resolution Steps**:
1. Check real-time agent availability
2. Review skill-based routing configuration
3. Analyze call distribution patterns
4. Monitor system CPU/memory
5. Consider queue callback options
6. Adjust routing priorities

## CTI Integration Issues

### Screen Pop Not Working
**Symptoms**: Agent screen doesn't populate with caller info
**Root Causes**:
- CTI connector failure
- CRM integration timeout
- Database lookup failure
- Caller ID not available

**Resolution Steps**:
1. Verify CTI connector service status
2. Test CRM API connectivity
3. Check database query performance
4. Validate caller ID transmission
5. Review screen pop script configuration

### Call Control Failures
**Symptoms**: Agent cannot transfer, hold, or conference calls
**Root Causes**:
- CTI server overload
- Permission issues
- Telephony resource exhaustion
- Network latency

**Resolution Steps**:
1. Check CTI server performance metrics
2. Verify agent role permissions
3. Monitor trunk utilization
4. Test network latency to CTI server
5. Review call control message logs

## Recording Issues

### Calls Not Being Recorded
**Symptoms**: Recording not starting or missing recordings
**Root Causes**:
- Recording server capacity
- Storage full
- Recording policy not triggered
- Network issues to recording server

**Resolution Steps**:
1. Check recording server storage capacity
2. Verify recording policy assignments
3. Test network connectivity to recorder
4. Review recording trigger conditions
5. Check for audio codec compatibility
