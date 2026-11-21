import React, { useEffect, useMemo, useState } from "react";
import { getStakingRewardsApi } from "../../../../Api/Service";
import UserTokens from "../userTokens";
import UserStaking from "../userStaking";
import HubChart from "./HubChart";
import mm from "./MemberHub.module.css";
import { buildStakingByAsset, buildTokenAllocation, formatMoney, summarizeTokens } from "./hubData";

const PortfolioTab = ({ userId, tokens = [], currency = "USD" }) => {
  const [stakings, setStakings] = useState([]);
  const [loadedRewards, setLoadedRewards] = useState(false);
  const [sub, setSub] = useState("tokens");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!userId) {
        setLoadedRewards(true);
        return;
      }
      try {
        const response = await getStakingRewardsApi(userId);
        if (alive && response?.success) {
          setStakings(response.stakings || []);
        }
      } catch (_error) {
        /* empty chart if rewards cannot be loaded */
      } finally {
        if (alive) setLoadedRewards(true);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [userId]);

  const tokenStats = useMemo(() => summarizeTokens(tokens), [tokens]);
  const tokenAllocation = useMemo(() => buildTokenAllocation(tokens), [tokens]);
  const stakingByAsset = useMemo(() => buildStakingByAsset(stakings), [stakings]);
  const stakedCount = stakings.length;
  const recordedProfit = stakingByAsset.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={mm.stack}>
      <section className={mm.stats} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <article className={mm.stat}>
          <p className={mm.statLabel}>Total token value</p>
          <p className={mm.statValue}>{formatMoney(tokenStats.totalValue, currency)}</p>
        </article>
        <article className={mm.stat}>
          <p className={mm.statLabel}>Number of tokens</p>
          <p className={mm.statValue}>{tokenStats.count}</p>
        </article>
        <article className={mm.stat}>
          <p className={mm.statLabel}>Staking records</p>
          <p className={mm.statValue}>{stakedCount}</p>
          <p className={mm.statHint}>{loadedRewards ? "From staking transactions" : "Loading records"}</p>
        </article>
        <article className={mm.stat}>
          <p className={mm.statLabel}>Recorded staking profit</p>
          <p className={`${mm.statValue} ${mm.up}`}>{formatMoney(recordedProfit, currency)}</p>
          <p className={mm.statHint}>Stored staking yield</p>
        </article>
      </section>

      <div className={mm.subTabs} role="tablist" aria-label="Portfolio sections">
        {[
          { id: "tokens", label: "Token Holdings" },
          { id: "staking", label: "Staking Settings" },
          { id: "analytics", label: "Allocation Analytics" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={sub === item.id}
            className={`${mm.subTab} ${sub === item.id ? mm.subTabActive : ""}`}
            onClick={() => setSub(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {sub === "tokens" && (
        <div className={mm.embed}>
          <UserTokens embedded />
        </div>
      )}

      {sub === "staking" && (
        <div className={mm.embed}>
          <UserStaking embedded />
        </div>
      )}

      {sub === "analytics" && (
        <div className={mm.grid2}>
          <section className={`${mm.card} ${mm.cardPad}`}>
            <div className={mm.cardHead}>
              <div>
                <h2 className={mm.title}>Token allocation</h2>
                <p className={mm.subtitle}>Current token values only</p>
              </div>
            </div>
            <HubChart type="pie" data={tokenAllocation} emptyLabel="No token values to chart" />
          </section>
          <section className={`${mm.card} ${mm.cardPad}`}>
            <div className={mm.cardHead}>
              <div>
                <h2 className={mm.title}>Staking profit by asset</h2>
                <p className={mm.subtitle}>Uses recorded totalProfit — not estimated APY</p>
              </div>
            </div>
            <HubChart
              type="pie"
              data={stakingByAsset}
              emptyLabel="No staking reward records"
            />
          </section>
        </div>
      )}
    </div>
  );
};

export default PortfolioTab;
