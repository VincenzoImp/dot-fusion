"use client";

import { useAccount, useChainId } from "wagmi";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

interface NetworkInfo {
  name: string;
  chainId: number;
  color: string;
  status: "connected" | "disconnected" | "wrong";
}

const NetworkStatus = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { targetNetwork } = useTargetNetwork();

  const networks: NetworkInfo[] = [
    {
      name: "Ethereum Sepolia",
      chainId: 11155111,
      color: "blue",
      status: chainId === 11155111 ? "connected" : chainId === targetNetwork.id ? "wrong" : "disconnected",
    },
    {
      name: "Polkadot Paseo",
      chainId: 420420422,
      color: "purple",
      status: chainId === 420420422 ? "connected" : chainId === targetNetwork.id ? "wrong" : "disconnected",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "wrong":
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "wrong":
        return "Wrong Network";
      default:
        return "Not Connected";
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span>Wallet not connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {networks.map(network => (
        <div key={network.chainId} className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-${network.color}-500`}></div>
          <span className="text-sm font-medium">{network.name}</span>
          <div className="flex items-center gap-1">
            {getStatusIcon(network.status)}
            <span
              className={`text-xs ${
                network.status === "connected"
                  ? "text-green-600"
                  : network.status === "wrong"
                    ? "text-yellow-600"
                    : "text-gray-500"
              }`}
            >
              {getStatusText(network.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NetworkStatus;
