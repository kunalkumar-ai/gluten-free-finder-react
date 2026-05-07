import React, { useState } from 'react';
import './AllergiesPage.css';

const ALLERGENS = [
  {
    id: 'gluten',
    icon: '🌾',
    name: 'Wheat / Gluten',
    note: 'Covers celiac disease',
    authority: 'both',
    color: '#2D6A4F',
    bg: '#D8F3DC',
    description: 'A protein found in wheat, barley, rye, and related grains. For people with celiac disease, even trace amounts trigger an immune response that damages the gut lining. The EU covers all gluten-containing cereals; the FDA specifically lists wheat.',
    sources: ['Bread & pasta', 'Beer & ales', 'Soy sauce', 'Cereals', 'Couscous', 'Seitan', 'Many sauces & gravies'],
    hidden: ['Spelt', 'Kamut', 'Farro', 'Durum', 'Semolina', 'Triticale', 'Malt', 'Einkorn', 'Emmer'],
  },
  {
    id: 'milk',
    icon: '🥛',
    name: 'Milk / Dairy',
    note: 'Includes cow, goat & sheep milk',
    authority: 'both',
    color: '#2C6E8A',
    bg: '#E5F4F8',
    description: 'Covers all ruminant milk — cow, goat, and sheep. A true milk allergy (immune reaction to casein/whey proteins) is distinct from lactose intolerance. Both conditions require avoiding dairy.',
    sources: ['Cheese', 'Butter & ghee', 'Cream', 'Ice cream', 'Yogurt', 'Baked goods', 'Chocolate', 'Margarine'],
    hidden: ['Casein', 'Whey', 'Lactalbumin', 'Lactoglobulin', 'Lactulose', 'Curd', 'Milk solids'],
  },
  {
    id: 'eggs',
    icon: '🥚',
    name: 'Eggs',
    note: 'Chicken, duck, geese & quail',
    authority: 'both',
    color: '#D4A017',
    bg: '#FDF6DC',
    description: 'Now covers eggs from chicken, duck, geese, and quail. Both egg white (albumin) and yolk proteins can cause reactions. One of the most common childhood allergies — sometimes outgrown, sometimes not.',
    sources: ['Mayonnaise', 'Meringue', 'Pasta', 'Baked goods', 'Egg-washed breads', 'Quiche', 'Glazes'],
    hidden: ['Albumin', 'Globulin', 'Lecithin (E322)', 'Lysozyme (E1105)', 'Ovalbumin', 'Ovomucin', 'Livetin'],
  },
  {
    id: 'peanuts',
    icon: '🥜',
    name: 'Peanuts',
    note: 'Groundnuts — a legume, not a nut',
    authority: 'both',
    color: '#92400E',
    bg: '#FEF3C7',
    description: 'Technically a legume, not a true nut. Peanut allergy is one of the most serious food allergies — rarely outgrown, and trace amounts can cause anaphylaxis. Cross-contamination in kitchens is a significant risk.',
    sources: ['Peanut butter', 'Satay sauce', 'Baked goods', 'African & Asian dishes', 'Some cereals', 'Energy bars'],
    hidden: ['Groundnuts', 'Beer nuts', 'Monkey nuts', 'Mixed nuts', 'Arachis oil', 'Mandelonas'],
  },
  {
    id: 'tree-nuts',
    icon: '🌳',
    name: 'Tree Nuts',
    note: 'Almonds, cashews, walnuts, pistachios + more',
    authority: 'both',
    color: '#6B4E9B',
    bg: '#F0EBF8',
    description: 'Each tree nut is a distinct allergen. The EU lists almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, and macadamia nuts. Allergy to one nut does not always mean allergy to all.',
    sources: ['Nut butters', 'Marzipan', 'Praline', 'Pesto', 'Nut oils', 'Nougat', 'Nutella', 'Trail mix'],
    hidden: ['Marzipan (almonds)', 'Praline', 'Gianduja', 'Nougat', 'Coconut (classified separately)'],
  },
  {
    id: 'fish',
    icon: '🐟',
    name: 'Fish',
    note: 'Bass, flounder, cod & more',
    authority: 'both',
    color: '#1B6CA8',
    bg: '#DBEAFE',
    description: 'Covers finfish species including bass, flounder, cod, salmon, tuna, and halibut. Fish allergies often persist for life. Reactions from cooking vapours have been reported. Cross-contamination is common in restaurants.',
    sources: ['Fish fillets', 'Fish sauce', 'Worcestershire sauce', 'Caesar dressing', 'Bouillabaisse', 'Gelatin'],
    hidden: ['Surimi', 'Imitation crab', 'Nam pla', 'Nuoc mam', 'Anchovy paste', 'Fish stock'],
  },
  {
    id: 'shellfish',
    icon: '🦐',
    name: 'Crustacean Shellfish',
    note: 'Crab, lobster, shrimp',
    authority: 'both',
    color: '#C1392B',
    bg: '#FDEDEB',
    description: 'One of the most common adult-onset allergies. Includes shrimp, crab, lobster, crayfish, and prawns. Reactions can be severe. Note: molluscs (oysters, mussels) are a separate EU allergen not covered by FDA.',
    sources: ['Shrimp', 'Crab', 'Lobster', 'Prawn', 'Crayfish', 'Barnacles', 'Shrimp paste', 'Krill'],
    hidden: ['Shrimp paste', 'Dried shrimp', 'Chitin', 'Glucosamine (often from shellfish)'],
  },
  {
    id: 'soy',
    icon: '🫘',
    name: 'Soybeans',
    note: 'Hidden in thousands of processed foods',
    authority: 'both',
    color: '#15803D',
    bg: '#DCFCE7',
    description: 'A legume found in an enormous range of processed foods. Highly refined soy oil and soy lecithin are sometimes tolerated, but this varies by individual. Soy is a staple in Asian cuisines — vigilance abroad is essential.',
    sources: ['Tofu & tempeh', 'Edamame', 'Miso', 'Soy sauce', 'Many processed foods', 'Protein bars', 'Infant formula'],
    hidden: ['Tamari', 'Textured vegetable protein (TVP)', 'Yuba', 'Kinnoko flour', 'Shoyu', 'Edamame'],
  },
  {
    id: 'sesame',
    icon: '🌱',
    name: 'Sesame',
    note: 'Added to FDA list in 2023 via FASTER Act',
    authority: 'both',
    color: '#7C3AED',
    bg: '#EDE9FE',
    description: 'The 9th and newest US major allergen, effective January 1 2023. Sesame is increasingly present in Western diets through hummus, artisan breads, and Asian cuisine. Sesame oil is not safe for those with sesame allergy.',
    sources: ['Hummus', 'Tahini', 'Sesame oil', 'Bagels', 'Breadsticks', 'Burger buns', 'Asian cuisine', 'Halva'],
    hidden: ['Tahini', 'Til / Gingelly', 'Benne', 'Sim sim', 'Sesame flour', 'Sesame seed paste'],
  },
  // EU Only
  {
    id: 'celery',
    icon: '🥬',
    name: 'Celery',
    note: 'Hidden in soups, stocks & spice mixes across Europe',
    authority: 'eu',
    color: '#166534',
    bg: '#F0FDF4',
    description: 'Widely used as a base flavour in European cooking. Celeriac, celery seeds, celery salt, and celery leaves are all covered. Particularly common in continental Europe — often invisible in stock cubes and spice blends.',
    sources: ['Soups & stocks', 'Spice mixes', 'Celery salt', 'Celeriac dishes', 'Vegetable juices', 'Pickles'],
    hidden: ['Celeriac', 'Celery salt', 'Celery seed extract', 'Celery oleoresin', 'Stock cubes'],
  },
  {
    id: 'mustard',
    icon: '🌿',
    name: 'Mustard',
    note: 'Common in sauces, dressings & curries',
    authority: 'eu',
    color: '#854D0E',
    bg: '#FEF9C3',
    description: 'All forms must be declared in the EU — seeds, powder, leaves, oil, and prepared condiment. A common hidden allergen in marinades, barbecue sauces, and curry powders where it is not obvious.',
    sources: ['Mustard condiment', 'Curry powder', 'Marinades', 'Salad dressings', 'Some breads', 'Cold cuts'],
    hidden: ['Mustard flour', 'Mustard oil', 'Mustard greens', 'Mustard powder in spice blends'],
  },
  {
    id: 'molluscs',
    icon: '🐚',
    name: 'Molluscs',
    note: 'Oysters, mussels, scallops & clams',
    authority: 'eu',
    color: '#0E7490',
    bg: '#CFFAFE',
    description: 'Distinct from crustacean shellfish. The EU separately regulates molluscs including oysters, mussels, scallops, clams, squid, octopus, and snails. Not currently a named allergen under US FDA rules.',
    sources: ['Oysters', 'Mussels', 'Scallops', 'Clams', 'Calamari', 'Squid ink pasta', 'Escargot'],
    hidden: ['Squid ink', 'Abalone', 'Periwinkle', 'Whelk', 'Limpet', 'Octopus'],
  },
  {
    id: 'lupin',
    icon: '🌸',
    name: 'Lupin',
    note: 'Flour substitute in gluten-free products',
    authority: 'eu',
    color: '#5B21B6',
    bg: '#EDE9FE',
    description: 'A flowering legume increasingly used as a gluten-free flour substitute in breads, pastries, and pasta. Cross-reactive with peanuts — people with peanut allergy may also react to lupin without knowing it.',
    sources: ['Lupin flour in GF breads', 'Some pasta', 'Pancake mixes', 'Lupini beans', 'Pastries'],
    hidden: ['Lupin flour', 'Lupin seed', 'Lupini beans', 'Sweet lupin', 'Lupin protein'],
  },
  {
    id: 'sulphites',
    icon: '🧪',
    name: 'Sulphites',
    note: 'Wine, dried fruit & preserved foods',
    authority: 'eu',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    description: 'Sulphur dioxide and sulphites are used as preservatives. Must be declared in the EU when above 10mg/kg or 10mg/litre. Particularly triggers asthma and respiratory reactions. Common in wine, beer, and dried fruits.',
    sources: ['Wine & beer', 'Dried fruits', 'Preserved meats', 'Pickled foods', 'Fruit juices', 'Vinegar'],
    hidden: ['E220–E228', 'Sodium metabisulphite', 'Potassium bisulphite', 'Sulphurous acid', 'SO₂'],
  },
];

const AllergiesPage = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = ALLERGENS.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.note.toLowerCase().includes(search.toLowerCase()) ||
      a.sources.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
      a.hidden.some((h) => h.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filter === 'all' ||
      (filter === 'both' && a.authority === 'both') ||
      (filter === 'eu' && a.authority === 'eu');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="allergies-page">

      {/* NAV */}
      <nav className="allergies-nav">
        <button className="allergies-back" onClick={onBack}>
          ← Back
        </button>
        <div className="allergies-logo">
          <div className="allergies-logo-mark">C</div>
          <span className="allergies-logo-text">Celiac<span>AI</span></span>
        </div>
        <div style={{ width: '80px' }} />
      </nav>

      {/* HERO */}
      <div className="allergies-hero">
        <div className="allergies-hero-inner">
          <span className="allergies-tag">Official Sources · FDA + EU</span>
          <h1 className="allergies-title">
            Common Food<br /><em>Allergens</em>
          </h1>
          <p className="allergies-subtitle">
            All 9 FDA-recognised and 14 EU Annex II allergens — with hidden label names, common sources, and authority coverage.
          </p>

          {/* SEARCH */}
          <div className="allergies-search-wrap">
            <span className="allergies-search-icon">🔍</span>
            <input
              className="allergies-search"
              type="text"
              placeholder="Search allergen, food source, or hidden name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="allergies-search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>

          {/* FILTER */}
          <div className="allergies-filters">
            {[
              { key: 'all', label: `All  (${ALLERGENS.length})` },
              { key: 'both', label: `FDA + EU  (${ALLERGENS.filter(a => a.authority === 'both').length})` },
              { key: 'eu', label: `EU Only  (${ALLERGENS.filter(a => a.authority === 'eu').length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`allergies-filter-btn ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="allergies-legend">
        <span className="legend-item">
          <span className="legend-badge badge-both">FDA + EU</span>
          Recognised by both authorities
        </span>
        <span className="legend-item">
          <span className="legend-badge badge-eu">EU Only</span>
          European Union Annex II only
        </span>
      </div>

      {/* GRID */}
      <div className="allergies-grid-wrap">
        {filtered.length === 0 ? (
          <div className="allergies-empty">
            <div className="allergies-empty-icon">🔍</div>
            <p>No allergens match "<strong>{search}</strong>"</p>
          </div>
        ) : (
          <div className="allergies-grid">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="allergen-card"
                style={{ '--accent': a.color, '--accent-bg': a.bg }}
              >
                <div className="allergen-card-header">
                  <div className="allergen-icon-wrap" style={{ background: a.bg }}>
                    <span className="allergen-icon">{a.icon}</span>
                  </div>
                  <span className={`allergen-badge ${a.authority === 'both' ? 'badge-both' : 'badge-eu'}`}>
                    {a.authority === 'both' ? 'FDA + EU' : 'EU Only'}
                  </span>
                </div>

                <div className="allergen-name">{a.name}</div>
                <div className="allergen-note">{a.note}</div>
                <p className="allergen-desc">{a.description}</p>

                <div className="allergen-section">
                  <div className="allergen-section-title">Common sources</div>
                  <div className="allergen-tags">
                    {a.sources.map((s) => (
                      <span key={s} className="allergen-tag">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="allergen-section">
                  <div className="allergen-section-title">Watch label for</div>
                  <div className="allergen-tags">
                    {a.hidden.map((h) => (
                      <span key={h} className="allergen-tag tag-hidden">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER NOTE */}
      <div className="allergies-footer-note">
        <p>Sources: <a href="https://www.fda.gov/food/food-allergies" target="_blank" rel="noopener noreferrer">FDA Food Allergies</a> · <a href="https://food.ec.europa.eu/food-safety/labelling-and-nutrition_en" target="_blank" rel="noopener noreferrer">EU Food Information Regulation 1169/2011</a></p>
        <p>Always consult a medical professional for diagnosis and dietary advice. This page is for informational purposes only.</p>
      </div>

    </div>
  );
};

export default AllergiesPage;
