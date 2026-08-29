use std::collections::HashSet;

use netstat2::{
    get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, SocketInfo,
};
use sysinfo::{Pid, ProcessesToUpdate, System};

use crate::errors::PortWatchError;

use super::{PortEntry, PortProtocol, PortProvider, PortQueryOptions};

#[derive(Clone, Copy, Default)]
pub struct NativePortProvider;

impl PortProvider for NativePortProvider {
    fn list_ports(&self, options: PortQueryOptions) -> Result<Vec<PortEntry>, PortWatchError> {
        if !options.show_tcp && !options.show_udp {
            return Ok(Vec::new());
        }

        let mut protocols = ProtocolFlags::empty();
        if options.show_tcp {
            protocols |= ProtocolFlags::TCP;
        }
        if options.show_udp {
            protocols |= ProtocolFlags::UDP;
        }

        let sockets = get_sockets_info(AddressFamilyFlags::all(), protocols)?;
        let process_ids: Vec<Pid> = sockets
            .iter()
            .flat_map(|socket| socket.associated_pids.iter().copied())
            .map(Pid::from_u32)
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();
        let mut system = System::new();
        system.refresh_processes(ProcessesToUpdate::Some(&process_ids), true);

        Ok(normalize_entries(filter_entries(
            sockets
                .into_iter()
                .flat_map(|socket| socket_entries(socket, &system))
                .collect(),
            options,
        )))
    }
}

fn socket_entries(socket: SocketInfo, system: &System) -> Vec<PortEntry> {
    let (port, protocol, address, state) = match socket.protocol_socket_info {
        ProtocolSocketInfo::Tcp(tcp) => (
            tcp.local_port,
            PortProtocol::Tcp,
            tcp.local_addr.to_string(),
            Some(tcp.state.to_string()),
        ),
        ProtocolSocketInfo::Udp(udp) => (
            udp.local_port,
            PortProtocol::Udp,
            udp.local_addr.to_string(),
            None,
        ),
    };

    if socket.associated_pids.is_empty() {
        return vec![entry_for_process(
            port, protocol, address, state, None, system,
        )];
    }

    socket
        .associated_pids
        .into_iter()
        .map(|pid| {
            entry_for_process(
                port,
                protocol,
                address.clone(),
                state.clone(),
                Some(pid),
                system,
            )
        })
        .collect()
}

fn filter_entries(entries: Vec<PortEntry>, options: PortQueryOptions) -> Vec<PortEntry> {
    entries
        .into_iter()
        .filter(|entry| match entry.protocol {
            PortProtocol::Tcp => options.show_tcp,
            PortProtocol::Udp => options.show_udp,
        })
        .filter(|entry| {
            !options.listening_only
                || entry.protocol == PortProtocol::Udp
                || entry.state.as_deref() == Some("LISTEN")
        })
        .collect()
}

fn entry_for_process(
    port: u16,
    protocol: PortProtocol,
    address: String,
    state: Option<String>,
    pid: Option<u32>,
    system: &System,
) -> PortEntry {
    let process = pid.and_then(|value| system.process(Pid::from_u32(value)));
    PortEntry {
        port,
        protocol,
        address,
        state,
        pid,
        process_name: process.map(|value| value.name().to_string_lossy().into_owned()),
        executable_path: process
            .and_then(|value| value.exe())
            .map(|value| value.to_string_lossy().into_owned()),
        username: None,
    }
}

fn normalize_entries(entries: Vec<PortEntry>) -> Vec<PortEntry> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::with_capacity(entries.len());

    for entry in entries {
        let key = (entry.port, entry.protocol, entry.address.clone(), entry.pid);
        if seen.insert(key) {
            normalized.push(entry);
        }
    }

    normalized.sort_by(|left, right| {
        (left.port, left.protocol, &left.address, left.pid).cmp(&(
            right.port,
            right.protocol,
            &right.address,
            right.pid,
        ))
    });
    normalized
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(port: u16, protocol: PortProtocol, address: &str, pid: Option<u32>) -> PortEntry {
        PortEntry {
            port,
            protocol,
            address: address.into(),
            state: (protocol == PortProtocol::Tcp).then(|| "LISTEN".into()),
            pid,
            process_name: None,
            executable_path: None,
            username: None,
        }
    }

    #[test]
    fn normalizes_order_by_port_protocol_address_and_pid() {
        let result = normalize_entries(vec![
            entry(8080, PortProtocol::Udp, "::", None),
            entry(3000, PortProtocol::Tcp, "127.0.0.1", Some(20)),
            entry(3000, PortProtocol::Tcp, "127.0.0.1", Some(10)),
        ]);

        assert_eq!(result[0].pid, Some(10));
        assert_eq!(result[1].pid, Some(20));
        assert_eq!(result[2].port, 8080);
    }

    #[test]
    fn removes_exact_duplicates() {
        let duplicate = entry(3000, PortProtocol::Tcp, "127.0.0.1", Some(10));
        let result = normalize_entries(vec![duplicate.clone(), duplicate]);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn preserves_protocol_address_family_and_shared_process_distinctions() {
        let result = normalize_entries(vec![
            entry(3000, PortProtocol::Tcp, "0.0.0.0", Some(10)),
            entry(3000, PortProtocol::Udp, "0.0.0.0", Some(10)),
            entry(3000, PortProtocol::Tcp, "::", Some(10)),
            entry(3000, PortProtocol::Tcp, "0.0.0.0", Some(20)),
        ]);
        assert_eq!(result.len(), 4);
    }

    #[test]
    fn filters_protocols_and_non_listening_tcp_records() {
        let mut established = entry(3001, PortProtocol::Tcp, "127.0.0.1", Some(10));
        established.state = Some("ESTABLISHED".into());
        let result = filter_entries(
            vec![
                entry(3000, PortProtocol::Tcp, "127.0.0.1", Some(10)),
                established,
                entry(5353, PortProtocol::Udp, "0.0.0.0", Some(20)),
            ],
            PortQueryOptions {
                show_tcp: true,
                show_udp: false,
                listening_only: true,
            },
        );

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].port, 3000);
    }

    #[test]
    fn returns_no_records_when_both_protocols_are_disabled() {
        let result = NativePortProvider.list_ports(PortQueryOptions {
            show_tcp: false,
            show_udp: false,
            listening_only: true,
        });
        assert_eq!(result.unwrap(), Vec::new());
    }

    #[test]
    fn discovers_a_real_listener_owned_by_this_test_process() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let result = NativePortProvider
            .list_ports(PortQueryOptions {
                show_tcp: true,
                show_udp: false,
                listening_only: true,
            })
            .unwrap();

        assert!(result.iter().any(|entry| {
            entry.port == port
                && entry.protocol == PortProtocol::Tcp
                && entry.pid == Some(std::process::id())
        }));
    }
}
