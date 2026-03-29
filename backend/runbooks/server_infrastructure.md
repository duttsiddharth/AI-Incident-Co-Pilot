# Server Infrastructure Troubleshooting Guide

## Overview
This runbook covers server infrastructure issues affecting UC/CC platforms including CPU, memory, storage, and service failures.

## Server Resource Issues

### High CPU Utilization
**Symptoms**: Slow response times, service timeouts, dropped connections
**Root Causes**:
- Runaway process
- Insufficient capacity
- Malware/cryptomining
- Memory thrashing

**Resolution Steps**:
1. Identify top CPU consumers (top/htop/Task Manager)
2. Check for runaway or zombie processes
3. Review scheduled tasks timing
4. Analyze application logs for loops
5. Scale up CPU or redistribute load
6. Kill problematic processes if safe

### Memory Exhaustion
**Symptoms**: OOM errors, service crashes, system unresponsive
**Root Causes**:
- Memory leak in application
- Insufficient RAM
- Cache not clearing
- Large file processing

**Resolution Steps**:
1. Identify memory consumers
2. Check for memory leaks (heap analysis)
3. Clear caches if safe
4. Restart affected services
5. Add swap space temporarily
6. Plan RAM upgrade if persistent

### Disk Space Issues
**Symptoms**: Write failures, database errors, log rotation failures
**Root Causes**:
- Log files filling disk
- Database growth
- Backup files not cleaned
- Temp files accumulated

**Resolution Steps**:
1. Identify largest files/directories (du -sh /*)
2. Clear old log files
3. Remove temporary files
4. Archive old database records
5. Clean package manager cache
6. Expand storage or add volume

## Service Failures

### Service Won't Start
**Symptoms**: Service shows stopped, start command fails
**Root Causes**:
- Port already in use
- Missing dependencies
- Configuration error
- Corrupted binary
- Insufficient permissions

**Resolution Steps**:
1. Check service logs for errors
2. Verify port availability (netstat)
3. Validate configuration files
4. Check file permissions
5. Verify dependencies are installed
6. Reinstall if binary corrupted

### Service Crashes Repeatedly
**Symptoms**: Service restarts frequently, watchdog alerts
**Root Causes**:
- Memory leak
- Unhandled exception
- Resource exhaustion
- Bug in code

**Resolution Steps**:
1. Collect crash dumps
2. Review application logs
3. Check for pattern (time, trigger)
4. Enable verbose logging
5. Roll back recent changes
6. Engage vendor support

## Database Issues

### Database Connection Failures
**Symptoms**: Application errors, timeouts, connection refused
**Root Causes**:
- Database service down
- Connection pool exhausted
- Network connectivity
- Authentication issues

**Resolution Steps**:
1. Verify database service status
2. Check connection pool settings
3. Test direct database connectivity
4. Review database logs
5. Clear stale connections
6. Restart database service

### Database Performance Degradation
**Symptoms**: Slow queries, high latency, timeouts
**Root Causes**:
- Missing indexes
- Table bloat
- Query inefficiency
- Lock contention

**Resolution Steps**:
1. Identify slow queries (slow query log)
2. Analyze query execution plans
3. Add missing indexes
4. Run database maintenance (VACUUM/ANALYZE)
5. Check for table locks
6. Optimize problematic queries

## Certificate Issues

### Certificate Expiry
**Symptoms**: TLS handshake failures, browser warnings
**Root Causes**:
- Certificate expired
- Certificate revoked
- Chain incomplete
- Clock skew

**Resolution Steps**:
1. Check certificate expiry date
2. Verify certificate chain
3. Check system time synchronization
4. Renew certificate
5. Update certificate in service
6. Restart services using certificate
