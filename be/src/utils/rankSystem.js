const RANK_CONFIG = [
  { key: "bronze", label: "Dong", divisions: 5, maxStars: 5 },
  { key: "silver", label: "Bac", divisions: 5, maxStars: 5 },
  { key: "gold", label: "Vang", divisions: 5, maxStars: 5 },
  { key: "diamond", label: "Kim Cuong", divisions: 5, maxStars: 5 },
  { key: "elite", label: "Tinh Anh", divisions: 5, maxStars: 5 },
  { key: "master", label: "Cao Thu", divisions: 1, maxStars: Infinity },
];

const tierIndexMap = RANK_CONFIG.reduce((acc, tier, index) => {
  acc[tier.key] = index;
  return acc;
}, {});

export const DEFAULT_RANK_STATE = {
  rankTier: "bronze",
  rankDivision: 5,
  rankStars: 0,
  rankEssence: 0,
};

const STAR_GAIN_PER_RANK_WIN = 1;
const ESSENCE_GAIN_PER_RANK_WIN = 20;
const ESSENCE_THRESHOLD = 100;

const getTierIndex = (key) =>
  typeof tierIndexMap[key] === "number" ? tierIndexMap[key] : 0;

const getTierByKey = (key) => RANK_CONFIG[getTierIndex(key)] || RANK_CONFIG[0];

const clampDivision = (tier, division) => {
  const maxDivision = tier.divisions || 1;
  if (division < 1) return 1;
  if (division > maxDivision) return maxDivision;
  return division;
};

export const formatRankLabel = (entity) => {
  const tier = getTierByKey(entity.rankTier);
  const stars = Math.floor(entity.rankStars || 0);
  if (tier.key === "master") {
    return `${tier.label} ${stars}*`;
  }
  const division = clampDivision(tier, entity.rankDivision || 1);
  return `${tier.label} ${division} - ${stars}*`;
};

const ensureRankState = (player) => {
  if (!player.rankTier) player.rankTier = DEFAULT_RANK_STATE.rankTier;
  if (!player.rankDivision) player.rankDivision = DEFAULT_RANK_STATE.rankDivision;
  if (player.rankStars === undefined || player.rankStars === null) {
    player.rankStars = DEFAULT_RANK_STATE.rankStars;
  }
  if (player.rankEssence === undefined || player.rankEssence === null) {
    player.rankEssence = DEFAULT_RANK_STATE.rankEssence;
  }
  if (!player.rank || typeof player.rank !== "string") {
    player.rank = formatRankLabel(player);
  }
};

const promoteTier = (player) => {
  const currentIndex = getTierIndex(player.rankTier);
  if (currentIndex >= RANK_CONFIG.length - 1) {
    player.rankTier = RANK_CONFIG[RANK_CONFIG.length - 1].key;
    player.rankDivision = 1;
    player.rankStars = 0;
    return;
  }
  const nextTier = RANK_CONFIG[currentIndex + 1];
  player.rankTier = nextTier.key;
  player.rankDivision = nextTier.divisions || 1;
  player.rankStars = 0;
};

const demoteTier = (player) => {
  const currentIndex = getTierIndex(player.rankTier);
  if (currentIndex <= 0) {
    player.rankTier = RANK_CONFIG[0].key;
    player.rankDivision = RANK_CONFIG[0].divisions;
    player.rankStars = 0;
    return;
  }
  const lowerTier = RANK_CONFIG[currentIndex - 1];
  player.rankTier = lowerTier.key;
  player.rankDivision = lowerTier.divisions;
  player.rankStars = Math.max((lowerTier.maxStars || 5) - 1, 0);
};

const addStars = (player, stars) => {
  ensureRankState(player);
  let remaining = stars;
  while (remaining > 0) {
    const tier = getTierByKey(player.rankTier);
    if (tier.key === "master") {
      player.rankStars += remaining;
      return;
    }
    const maxStars = tier.maxStars || 5;
    const needed = maxStars - player.rankStars;
    if (needed <= 0) {
      player.rankStars = 0;
      if (player.rankDivision > 1) {
        player.rankDivision -= 1;
      } else {
        promoteTier(player);
      }
      continue;
    }
    if (remaining < needed) {
      player.rankStars += remaining;
      return;
    }
    player.rankStars += needed;
    remaining -= needed;
    if (player.rankStars >= maxStars) {
      player.rankStars = 0;
      if (player.rankDivision > 1) {
        player.rankDivision -= 1;
      } else {
        promoteTier(player);
      }
    }
  }
};

const removeStars = (player, count) => {
  ensureRankState(player);
  let remaining = count;
  while (remaining > 0) {
    const tier = getTierByKey(player.rankTier);
    if (
      tier.key === RANK_CONFIG[0].key &&
      player.rankDivision === tier.divisions &&
      player.rankStars === 0
    ) {
      return;
    }

    if (player.rankStars > 0) {
      player.rankStars -= 1;
      remaining -= 1;
      continue;
    }

    if (tier.key === "master") {
      if (player.rankStars > 0) {
        player.rankStars -= 1;
        remaining -= 1;
        continue;
      }
      demoteTier(player);
      continue;
    }

    if (player.rankDivision < tier.divisions) {
      player.rankDivision += 1;
    } else {
      demoteTier(player);
    }

    const updatedTier = getTierByKey(player.rankTier);
    player.rankStars = Math.max((updatedTier.maxStars || 5) - 1, 0);
    remaining -= 1;
  }
};

const addEssence = (player, amount) => {
  ensureRankState(player);
  player.rankEssence = (player.rankEssence || 0) + amount;
  while (player.rankEssence >= ESSENCE_THRESHOLD) {
    player.rankEssence -= ESSENCE_THRESHOLD;
    addStars(player, 1);
  }
  if (player.rankEssence < 0) player.rankEssence = 0;
  if (player.rankEssence >= ESSENCE_THRESHOLD) {
    player.rankEssence = ESSENCE_THRESHOLD - 1;
  }
};

export const applyRankWin = (player) => {
  ensureRankState(player);
  addStars(player, STAR_GAIN_PER_RANK_WIN);
  addEssence(player, ESSENCE_GAIN_PER_RANK_WIN);
  player.rank = formatRankLabel(player);
};

export const applyRankLoss = (player) => {
  ensureRankState(player);
  removeStars(player, 1);
  player.rankEssence = Math.max(0, player.rankEssence || 0);
  player.rank = formatRankLabel(player);
};

export const getRankSummary = (player) => {
  ensureRankState(player);
  const tier = getTierByKey(player.rankTier);
  return {
    tier: tier.label,
    tierKey: tier.key,
    division: clampDivision(tier, player.rankDivision || 1),
    stars: Math.floor(player.rankStars || 0),
    essence: player.rankEssence || 0,
  };
};
