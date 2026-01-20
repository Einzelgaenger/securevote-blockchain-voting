/**
 * Smart Contract Addresses
 * Update these after deploying contracts to your network
 */

export const CONTRACT_ADDRESSES = {
  MinimalForwarder: import.meta.env.VITE_MINIMAL_FORWARDER_ADDRESS as `0x${string}`,
  SponsorVault: import.meta.env.VITE_SPONSOR_VAULT_ADDRESS as `0x${string}`,
  VotingRoomImplementation: import.meta.env.VITE_VOTING_ROOM_IMPLEMENTATION_ADDRESS as `0x${string}`,
  RoomFactory: import.meta.env.VITE_ROOM_FACTORY_ADDRESS as `0x${string}`,
} as const;

// Validate addresses are set
export function validateContracts() {
  const missing: string[] = [];
  
  Object.entries(CONTRACT_ADDRESSES).forEach(([name, address]) => {
    if (!address || address === '') {
      missing.push(name);
    }
  });
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing contract addresses:', missing.join(', '));
    console.warn('Update .env file with deployed contract addresses');
    return false;
  }
  
  return true;
}
