# VPS Security and Operations Audit

Date: 2026-08-13

## Scope and Method

Read-only audit of the authorized SSH target configured as `vps` (`vmi2872359`, Ubuntu 24.04). Collected listeners, UFW/iptables/nftables rules, Docker/Caddy state, SSH effective configuration, patch status, service logs, and backup/timer evidence. No server configuration or data was changed.

## Findings

| ID | Module / component | Type | Severity | Description | Steps to reproduce / evidence | Business impact | Recommendation |
|---|---|---|---|---|---|---|---|
| VPS-01 | `maubot-neo4j-1` Docker container | Security / network | High | Neo4j is published on `0.0.0.0:7474` and `0.0.0.0:7687`. Docker NAT rules allow these ports even though UFW does not list them. | Remote TCP checks from the audit host succeeded on ports 7474 and 7687. An unauthenticated transaction request returned Neo4j `Unauthorized`, proving the database service is directly reachable. | Public database/browser attack surface, brute-force exposure, and risk of future auth/configuration mistakes. | Bind Neo4j to loopback or an internal Docker network; remove public port mappings; restrict access with host/cloud firewall. |
| VPS-02 | Host patch/reboot state | Operations / security | High | Kernel reboot is required and `apt-get -s upgrade` reports 23 upgrades available, including Docker, containerd, Node.js, AppArmor, and networking packages. | `/var/run/reboot-required` exists; Ubuntu 24.04; simulated upgrade lists 23 packages. | Known vulnerabilities may remain active; Docker/runtime updates are especially sensitive. | Schedule a maintenance window, apply updates, reboot, and verify all services/health checks afterward. |
| VPS-03 | SSH daemon | Security / hardening | Medium | Root SSH is globally reachable. Password auth is disabled, but X11 forwarding, TCP forwarding, agent forwarding, and no client idle timeout remain enabled. | `sshd -T`: `permitrootlogin without-password`, `passwordauthentication no`, `x11forwarding yes`, `allowtcpforwarding yes`, `allowagentforwarding yes`, `clientaliveinterval 0`. | Root compromise or a stolen authorized key has broad impact; forwarding can provide tunnel/pivot paths. | Use a non-root admin with sudo, restrict SSH by source/IP or VPN, disable unused forwarding/X11, set client idle timeouts, and keep fail2ban. |
| VPS-04 | Docker/UFW boundary | Security / network | Medium | Docker-published ports can bypass UFW policy. The Neo4j exposure demonstrates that a default-deny UFW policy is not sufficient for container ports. | `ufw status`: only 22/80/443 and two UDP ports; `iptables/nft`: Docker chains accept 7474/7687; external checks succeeded. | Future accidental port publishing can expose databases or internal APIs. | Enforce policy in `DOCKER-USER`, bind services explicitly to loopback/internal interfaces, and include external port scans in deployment checks. |
| VPS-05 | MiFlota health endpoint | Information disclosure | Low | Public production health response exposes `/data/miflota.db`. | `GET https://miflota.147-93-180-120.sslip.io/api/health` returned `{"ok":true,"db":"/data/miflota.db"}`. | Gives attackers filesystem and deployment details. | Return a minimal public liveness response and keep diagnostics internal. |
| VPS-06 | Caddy response policy | Security hardening | Low | HTTP redirects to HTTPS, but no HSTS header was observed on the HTTPS health response. | HTTP returned `308` to HTTPS; HTTPS response did not include `Strict-Transport-Security`. | First-visit downgrade remains possible if a user follows an HTTP link before receiving HSTS. | Add HSTS after confirming all relevant hostnames are HTTPS-only; add standard security headers. |
| VPS-07 | Backup scheduling | Availability / recovery | Medium | MiFlota backup files exist under `/root/backups`, but no MiFlota-specific systemd timer or backup service was found. Only a Duette backup timer was visible. | Read-only search of systemd timers and cron files; manual MiFlota backup files were present. | Recovery depends on manual operator behavior and backup freshness is not guaranteed. | Add an encrypted, automated, tested MiFlota SQLite/WAL backup with retention and off-host copy; periodically test restore. |
| VPS-08 | Service hardening | Security hardening | Low | Caddy runs as user `caddy` with `PrivateTmp` and `ProtectSystem=full`, but `NoNewPrivileges=no` and `ProtectHome=no`; Docker has `liveRestore=false`. | `systemctl show caddy`; `docker info`. | Limited blast-radius hardening and less resilient Docker restarts. | Apply least-privilege systemd sandboxing compatible with Caddy and evaluate Docker live restore after testing. |

## Positive Controls

- UFW default policy is deny incoming and deny routed traffic.
- SSH password and keyboard-interactive authentication are disabled.
- Fail2ban has an active `sshd` jail with banned addresses.
- MiFlota API is bound to `127.0.0.1:8791` on the host and is reverse-proxied through Caddy.
- PostgreSQL is bound to `127.0.0.1:5432`.
- Caddy is active and HTTP-to-HTTPS redirect worked.
- MiFlota and PostgreSQL containers reported healthy; disk and memory headroom were ample during the audit.

## Immediate Priority

1. Remove public Neo4j port mappings and enforce the restriction in `DOCKER-USER`.
2. Patch and reboot the VPS during a controlled maintenance window.
3. Restrict SSH root access and disable unused forwarding features.
4. Establish automated off-host MiFlota backups and restore verification.
