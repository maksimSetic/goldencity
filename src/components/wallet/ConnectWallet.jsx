import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaWallet, FaTimes } from "react-icons/fa";
import {
  WalletMetamask,
  WalletCoinbase,
  ExchangeBinance,
  WalletLedger,
  WalletTrezor,
} from "@web3icons/react";
import { ethers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";

const SOFTWARE_WALLETS = [
  { name: "MetaMask", id: "metamask" },
  { name: "Coinbase Wallet", id: "coinbase" },
  { name: "Binance Wallet", id: "binance" },
];

const HARDWARE_WALLETS = [
  { name: "Ledger", id: "ledger" },
  { name: "Trezor", id: "trezor" },
];

const WALLET_ICONS = {
  metamask: <WalletMetamask size={32} className="mr-2" />,
  coinbase: <WalletCoinbase size={32} className="mr-2" />,
  binance: <ExchangeBinance size={32} className="mr-2" />,
  ledger: <WalletLedger size={32} className="mr-2" />,
  trezor: <WalletTrezor size={32} className="mr-2" />,
};

function ConnectWallet({ buttonClass, buttonChildren }) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("");
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [externalProvider, setExternalProvider] = useState(null);

  const triggerClass =
    buttonClass ||
    "px-5 py-2 bg-primary-600 text-white rounded-lg shadow font-semibold flex items-center gap-2 hover:scale-105 transition-transform duration-200";
  const triggerChildren = buttonChildren || (
    <>
      <FaWallet className="text-lg" /> Connect Wallet
    </>
  );

  const short = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const connectMetaMask = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        setStatus("MetaMask not found.");
        return;
      }

      let metamaskProvider = null;
      if (Array.isArray(ethereum.providers)) {
        metamaskProvider = ethereum.providers.find((p) => p.isMetaMask) || null;
      }
      if (!metamaskProvider && ethereum.isMetaMask) metamaskProvider = ethereum;

      if (!metamaskProvider) {
        setStatus("MetaMask not found among injected providers.");
        return;
      }

      const accounts = await metamaskProvider.request({
        method: "eth_requestAccounts",
      });
      if (!accounts || accounts.length === 0) {
        setStatus("No accounts returned by MetaMask.");
        return;
      }

      const provider = new ethers.providers.Web3Provider(metamaskProvider);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      setConnectedAddress(address);
      setExternalProvider(metamaskProvider);
      setStatus("Connected: " + short(address));

      const handleAccountsChanged = (accs) => {
        if (!accs || accs.length === 0) {
          setConnectedAddress(null);
          setStatus("");
        } else {
          setConnectedAddress(accs[0]);
          setStatus("Connected: " + short(accs[0]));
        }
      };

      const handleChainChanged = (_chainId) => {
        setStatus((s) => s + " (chain changed)");
      };

      try {
        metamaskProvider.on &&
          metamaskProvider.on("accountsChanged", handleAccountsChanged);
        metamaskProvider.on &&
          metamaskProvider.on("chainChanged", handleChainChanged);
      } catch (e) {}

      metamaskProvider._cleanup = () => {
        try {
          metamaskProvider.removeListener &&
            metamaskProvider.removeListener(
              "accountsChanged",
              handleAccountsChanged
            );
          metamaskProvider.removeListener &&
            metamaskProvider.removeListener("chainChanged", handleChainChanged);
        } catch (e) {}
      };
    } catch (err) {
      setStatus("Connection failed: " + (err.message || err));
    }
  };

  const connectCoinbase = async () => {
    try {
      if (window.ethereum && window.ethereum.isCoinbaseWallet) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setConnectedAddress(address);
        setExternalProvider(window.ethereum);
        setStatus("Connected: " + short(address));
        return;
      }
      await connectWalletConnect();
    } catch (err) {
      setStatus("Connection failed: " + (err.message || err));
    }
  };

  const connectBinance = async () => {
    try {
      if (window.BinanceChain) {
        await window.BinanceChain.request({ method: "eth_requestAccounts" });
        const provider = new ethers.providers.Web3Provider(window.BinanceChain);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setConnectedAddress(address);
        setExternalProvider(window.BinanceChain);
        setStatus("Connected: " + short(address));
        return;
      }
      setStatus("Binance Wallet not found. Falling back to WalletConnect.");
      await connectWalletConnect();
    } catch (err) {
      setStatus("Connection failed: " + (err.message || err));
    }
  };

  const connectWalletConnect = async () => {
    try {
      const wcProvider = new WalletConnectProvider({
        rpc: { 1: "https://cloudflare-eth.com" },
        qrcode: true,
      });
      await wcProvider.enable();
      const provider = new ethers.providers.Web3Provider(wcProvider);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setConnectedAddress(address);
      setExternalProvider(wcProvider);
      setStatus("Connected: " + short(address));
    } catch (err) {
      setStatus("WalletConnect failed: " + (err.message || err));
    }
  };

  const handleWalletClick = (id) => {
    setStatus("");
    if (id === "metamask") return connectMetaMask();
    if (id === "coinbase") return connectCoinbase();
    if (id === "binance") return connectBinance();
    setStatus("Integration coming soon!");
  };

  const disconnect = async () => {
    try {
      if (externalProvider && externalProvider.disconnect) {
        await externalProvider.disconnect();
      }
    } catch (err) {}
    setConnectedAddress(null);
    setExternalProvider(null);
    setStatus("");
  };

  return (
    <div>
      <button className={triggerClass} onClick={() => setShowModal(true)}>
        {triggerChildren}
      </button>
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="wallet-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white/90 backdrop-blur-lg border border-gray-200 shadow-2xl rounded-md p-6 min-w-[340px] max-w-[90vw]"
            >
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
              <h2 className="text-2xl font-semibold mb-4 text-center text-primary-700">
                Connect Your Wallet
              </h2>

              {connectedAddress ? (
                <div className="mb-4 text-center">
                  <div className="font-semibold">Connected</div>
                  <div className="mt-2 text-sm text-gray-700">
                    {short(connectedAddress)}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={disconnect}
                      className="px-4 py-2 rounded bg-gray-200"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="font-medium mb-2 text-primary-600">
                      Software Wallets
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {SOFTWARE_WALLETS.map((w) => (
                        <button
                          key={w.id}
                          className="flex items-center px-4 py-3 rounded-md border border-gray-200 bg-white hover:bg-blue-50 shadow-sm transition-all duration-200"
                          onClick={() => handleWalletClick(w.id)}
                        >
                          {WALLET_ICONS[w.id]}
                          <span className="font-medium text-lg text-gray-800">
                            {w.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="font-medium mb-2 text-primary-600">
                      Hardware Wallets
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {HARDWARE_WALLETS.map((w) => (
                        <button
                          key={w.id}
                          className="flex items-center px-4 py-3 rounded-md border border-gray-200 bg-white hover:bg-blue-50 shadow-sm transition-all duration-200"
                          onClick={() => setStatus("Integration coming soon!")}
                        >
                          {WALLET_ICONS[w.id]}
                          <span className="font-medium text-lg text-gray-800">
                            {w.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {status && (
                    <div className="text-sm text-gray-700 mb-2">{status}</div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConnectWallet;
