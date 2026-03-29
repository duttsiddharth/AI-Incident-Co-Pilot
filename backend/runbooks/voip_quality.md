# VoIP Quality Troubleshooting Guide

## Overview
This runbook covers VoIP quality issues in UC environments including audio quality, codec problems, and media path issues.

## Audio Quality Problems

### Echo on Calls
**Symptoms**: Caller hears their own voice repeated
**Root Causes**:
- Acoustic echo from speakerphone
- Electrical echo from hybrid circuit
- Echo canceller disabled/misconfigured
- High latency causing delayed echo

**Resolution Steps**:
1. Identify echo source (near-end or far-end)
2. Enable/adjust echo cancellation on endpoint
3. Reduce speaker volume on speakerphones
4. Check for impedance mismatch on PSTN trunks
5. Reduce network latency if delay-based
6. Test with different handset

### Static/Noise on Line
**Symptoms**: Background hissing, clicking, or buzzing
**Root Causes**:
- Electrical interference
- Poor network connection
- Codec compression artifacts
- Analog line issues

**Resolution Steps**:
1. Test with different network path
2. Switch to higher quality codec (G.722)
3. Check for electrical interference sources
4. Inspect cabling for damage
5. Test with different endpoint
6. Enable comfort noise generation

### Volume Issues
**Symptoms**: Audio too quiet or too loud
**Root Causes**:
- Gain settings incorrect
- TX/RX level mismatch
- Codec gain differences
- Hardware issue

**Resolution Steps**:
1. Adjust endpoint volume settings
2. Check gain settings in phone system
3. Verify codec transmit/receive levels
4. Test with different headset
5. Review audio processing settings

## Codec Issues

### Codec Negotiation Failures
**Symptoms**: Call connects but no audio, or call fails with 488
**Root Causes**:
- No common codec between endpoints
- Codec disabled on one side
- Transcoding resource exhausted
- SDP parsing error

**Resolution Steps**:
1. Review SDP in SIP messages
2. Enable common codec on both endpoints
3. Prioritize compatible codecs
4. Check transcoder availability
5. Verify codec license

### Transcoding Quality Loss
**Symptoms**: Noticeable audio degradation on some calls
**Root Causes**:
- Multiple transcoding hops
- Low-quality codec in chain
- Transcoder resource constraint

**Resolution Steps**:
1. Map media flow path
2. Minimize transcoding by aligning codecs
3. Use higher-quality codecs where possible
4. Add transcoding resources if needed
5. Enable direct media when possible

## Media Path Issues

### No Audio (Both Directions)
**Symptoms**: Call connects, both parties silent
**Root Causes**:
- RTP ports blocked
- Media gateway failure
- NAT traversal failure
- Incorrect media routing

**Resolution Steps**:
1. Check firewall rules for RTP ports
2. Verify media gateway status
3. Enable TURN server for NAT
4. Review media routing configuration
5. Check for IP phone media address
6. Capture RTP trace for analysis

### Audio Dropouts
**Symptoms**: Brief periods of silence during call
**Root Causes**:
- Packet loss
- Jitter exceeding buffer
- Network congestion
- Wireless interference

**Resolution Steps**:
1. Measure packet loss (target <1%)
2. Check jitter values and buffer
3. Review network QoS configuration
4. Test wired vs wireless connection
5. Check for competing traffic
6. Enable FEC if supported

## Endpoint Issues

### Phone Not Registering
**Symptoms**: Phone shows "Registering" or "Unregistered"
**Root Causes**:
- Network connectivity
- Authentication failure
- Server unreachable
- Certificate issue (TLS)

**Resolution Steps**:
1. Verify network connectivity (DHCP, DNS)
2. Check phone credentials
3. Test SIP server reachability
4. Review phone provisioning
5. Factory reset if necessary
6. Check certificate validity

### Phone Reboot Loop
**Symptoms**: Phone continuously rebooting
**Root Causes**:
- Firmware corruption
- Configuration error
- Power issue
- Hardware failure

**Resolution Steps**:
1. Check PoE power delivery
2. Factory reset phone
3. Re-provision with default config
4. Try different firmware version
5. Test with AC adapter
6. Replace device if hardware issue
