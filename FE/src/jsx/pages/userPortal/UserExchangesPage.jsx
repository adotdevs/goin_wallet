import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import MoonPay from "../../../assets/images/logos/3.png";
import CoinBase from "../../../assets/images/logos/coinbase.svg";
import Bitpanda from "../../../assets/images/logos/bitpanda-fcb-acm-nfl-logos.gif";
import Binance from "../../../assets/images/logos/binance.png";
import Crypto from "../../../assets/images/logos/crypto-com-vector-logo.png";
import Kraken from "../../../assets/images/logos/kraken-logo@logotyp.us.svg";
import Kucoin from "../../../assets/images/logos/kucoin.svg";
import Paybis from "../../../assets/images/logos/5.png";
import coinspot from "../../../assets/images/logos/6.png";
import bybit from "../../../assets/images/logos/8.png";
import gateio from "../../../assets/images/logos/gateio.png";
import Mercury from "../../../assets/images/logos/mercuryo.png";
import bitvao from "../../../assets/images/logos/4.png";
import Ramp from "../../../assets/images/logos/7.png";
import safello from "../../../assets/images/logos/9.png";
import bitpay from "../../../assets/logo/bitpay.svg";
import transak from "../../../assets/logo/transak-logo.svg";
import bit2me from "../../../assets/logo/bit2me-logo-light.svg";
import bitget from "../../../assets/images/logos/10.png";
import bingx from "../../../assets/logo/bingx-logo-0C09A379A0-seeklogo.com.png";
import gemini from "../../../assets/images/logos/11.png";
import valr from "../../../assets/logo/valr.jpg";
import Upbit from "../../../assets/logo/upbit_logo.35a5b2a.svg";
import { getLinksApi } from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

const EXCHANGES = [
  { name: "MoonPay", logo: MoonPay, link: "https://www.moonpay.com" },
  { name: "Coinbase", logo: CoinBase, link: "https://www.coinbase.com" },
  { name: "Bitpanda", logo: Bitpanda, link: "https://www.bitpanda.com" },
  { name: "Binance", logo: Binance, link: "https://www.binance.com" },
  { name: "Mercuryo", logo: Mercury, link: "https://www.mercuryo.io" },
  { name: "Crypto.com", logo: Crypto, link: "https://crypto.com" },
  { name: "Kraken", logo: Kraken, link: "https://www.kraken.com" },
  { name: "Bitvavo", logo: bitvao, link: "https://bitvavo.com" },
  { name: "KuCoin", logo: Kucoin, link: "https://www.kucoin.com" },
  { name: "Paybis", logo: Paybis, link: "https://paybis.com" },
  { name: "CoinSpot", logo: coinspot, link: "https://www.coinspot.com.au" },
  { name: "Bybit", logo: bybit, link: "https://www.bybit.com" },
  { name: "Gate.io", logo: gateio, link: "https://www.gate.io" },
  { name: "Bitget", logo: bitget, link: "https://www.bitget.com" },
  { name: "Ramp", logo: Ramp, link: "https://ramp.network/" },
  { name: "Safello", logo: safello, link: "https://safello.com/" },
  { name: "BitPay", logo: bitpay, link: "https://bitpay.com/" },
  { name: "Transak", logo: transak, link: "https://transak.com/" },
  { name: "Bit2Me", logo: bit2me, link: "https://bit2me.com/", lightLogo: true },
  { name: "BingX", logo: bingx, link: "https://bingx.com/en/" },
  { name: "Gemini", logo: gemini, link: "https://www.gemini.com/" },
  { name: "VALR", logo: valr, link: "https://www.valr.com/" },
  { name: "Upbit", logo: Upbit, link: "https://upbit.com" },
];

export default function UserExchangesPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (["admin", "superadmin", "subadmin"].includes(role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const fetchLinks = async () => {
      try {
        const data = await getLinksApi();
        if (data?.links?.[4]?.enabled) {
          setIsLoading(false);
        } else {
          navigate(-1);
        }
      } catch {
        setIsLoading(false);
      }
    };
    fetchLinks();
  }, [authUser, navigate]);

  const filtered = EXCHANGES.filter((ex) =>
    ex.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <UserPortalShell title="Exchanges">
      <div className="space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              Partner Exchanges
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              Choose a trusted global platform to buy, sell, or transfer crypto assets.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exchange..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 rounded-2xl bg-white border border-slate-200/80 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filtered.map((ex) => (
              <a
                key={ex.name}
                href={ex.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 shadow-card hover:shadow-md p-5 flex flex-col justify-between gap-4 transition-all no-underline"
              >
                <div
                  className={`h-16 rounded-xl flex items-center justify-center px-3 ${
                    ex.lightLogo ? "bg-slate-900" : "bg-slate-50"
                  }`}
                >
                  <img
                    src={ex.logo}
                    alt={`${ex.name} logo`}
                    loading="lazy"
                    className="max-h-10 max-w-[130px] object-contain"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {ex.name}
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-600 text-slate-500 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </UserPortalShell>
  );
}
