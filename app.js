// =========================================================
// MOTO MAPS
// ОСНОВНА ЛОГІКА
// =========================================================


// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL =
  'https://mthbckypfurmebncdukj.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_gfNOlLBzqvK-Sm9PfOzlWA_bDHq-MME';

let supabaseClient = null;

if (window.supabase) {

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  console.log('Supabase підключено');

}


// =========================================================
// КАРТА
// =========================================================

const MAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/liberty'
};

let activeMapStyle = MAP_STYLES[getSavedTheme()];

const map = new maplibregl.Map({
  container: 'map',
  style: activeMapStyle,
  center: [35.1396, 47.8388],
  zoom: 12
});

const DARK_ROAD_COLOR = [
  'match',
  ['get', 'class'],
  'motorway', '#e3eaf2',
  'motorway_link', '#d7e1ec',
  'trunk', '#cbd7e4',
  'primary', '#bfcede',
  'secondary', '#b2c2d3',
  'tertiary', '#a5b6c9',
  'minor', '#98abc0',
  'service', '#899db3',
  'track', '#91a5bb',
  'path', '#879bb1',
  'cycleway', '#a5b8cb',
  'pedestrian', '#afc0d1',
  '#9badc1'
];

// Кольори тексту карти — змінюй HEX-коди тут.
const DARK_ROAD_LABEL_COLOR = '#f2f5f8';
const DARK_ROAD_LABEL_HALO_COLOR = '#2b3e50';
const DARK_CITY_LABEL_COLOR = '#f5f7fa';
const DARK_PLACE_LABEL_COLOR = '#d6e0e9';
const DARK_PLACE_LABEL_HALO_COLOR = '#2b3e50';

function applyDarkMapColors() {
  if (activeMapStyle !== MAP_STYLES.dark) {
    return;
  }

  const style = map.getStyle();
  const layers = style && style.layers ? style.layers : [];

  layers.forEach(function(layer) {
    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', '#2b3e50');
    }

    if (
      layer.type === 'line' &&
      layer['source-layer'] === 'transportation'
    ) {
      map.setPaintProperty(
        layer.id,
        'line-color',
        DARK_ROAD_COLOR
      );
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'building'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', '#3a4d60');
      map.setPaintProperty(layer.id, 'fill-outline-color', '#4b6075');
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'water'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', '#1d3042');
    }

    if (
      layer.type === 'line' &&
      layer['source-layer'] === 'waterway'
    ) {
      map.setPaintProperty(layer.id, 'line-color', '#435a70');
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'landuse'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', [
        'match',
        ['get', 'class'],
        'park', '#344b5a',
        'cemetery', '#334957',
        'residential', '#304457',
        'industrial', '#2d4153',
        '#304457'
      ]);
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'landcover'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', [
        'match',
        ['get', 'class'],
        'wood', '#344b60',
        'grass', '#32495c',
        '#2f4558'
      ]);
    }

    if (
      layer.id === 'Road labels' &&
      layer.type === 'symbol'
    ) {
      map.setPaintProperty(
        layer.id,
        'text-color',
        DARK_ROAD_LABEL_COLOR
      );
      map.setPaintProperty(
        layer.id,
        'text-halo-color',
        DARK_ROAD_LABEL_HALO_COLOR
      );
      map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
    }

    if (
      (layer.id === 'Place labels' || layer.id === 'City labels') &&
      layer.type === 'symbol'
    ) {
      map.setPaintProperty(
        layer.id,
        'text-color',
        layer.id === 'City labels'
          ? DARK_CITY_LABEL_COLOR
          : DARK_PLACE_LABEL_COLOR
      );
      map.setPaintProperty(
        layer.id,
        'text-halo-color',
        DARK_PLACE_LABEL_HALO_COLOR
      );
      map.setPaintProperty(layer.id, 'text-halo-width', 1.75);
    }

  });
}

map.on('style.load', function() {
  applyDarkMapColors();
  addActiveRouteLayer();
});

map.on('click', function() {
  closeRideDetailSheet();
});


// OpenFreeMap надає окремі стилі для світлої та темної теми.


// =========================================================
// ЗМІННІ
// =========================================================

let myMarker = null;

let activeRouteGeoJSON = null;

let activeRouteDestination = null;

let activeRouteOrigin = null;

let routeRequestSerial = 0;

let meetingMarker = null;

let meetingLocation = null;

let rideMarkers = [];
let mapSidebarRides = [];
let currentDirectChat = null;
let directChatPollTimer = null;
let directChatLoading = false;
let activeRidePopup = null;

let currentScreen = 'map';

let profileReturnScreen = 'map';

let choosingLocation = false;

let currentRidersRideId = null;


// =========================================================
// THEME
// =========================================================

const systemThemeQuery = window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function getThemeMode() {
  const savedMode = localStorage.getItem('motoTheme');
  return ['auto', 'light', 'dark'].includes(savedMode)
    ? savedMode
    : 'auto';
}

function getSystemTheme() {
  return systemThemeQuery && systemThemeQuery.matches
    ? 'dark'
    : 'light';
}

function getSavedTheme() {
  const mode = getThemeMode();
  return mode === 'auto' ? getSystemTheme() : mode;
}


function applyTheme(theme, savePreference = true) {

  const safeTheme =
    theme === 'light'
      ? 'light'
      : 'dark';

  document.documentElement.dataset.theme =
    safeTheme;

  const nextMapStyle =
    MAP_STYLES[safeTheme];

  if (activeMapStyle !== nextMapStyle) {
    activeMapStyle = nextMapStyle;
    map.setStyle(activeMapStyle);
  }

  if (savePreference) {
    localStorage.setItem('motoTheme', safeTheme);
  }
  const themeToggleIcon =
  document.getElementById('themeToggleIcon');

if (themeToggleIcon) {
  themeToggleIcon.innerHTML = `
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10.1 2.4h3.8v3.2h-3.8z"></path>
      <circle cx="12" cy="13" r="5.3"></circle>
      <path d="M12 20.1v2.1"></path>
      <path d="m5.2 6.2 1.6 1.6"></path>
      <path d="m17.2 17.2 1.6 1.6"></path>
      <path d="M2.5 12.8h2.2"></path>
      <path d="M19.3 12.8h2.2"></path>
      <path d="m5.2 19 1.6-1.6"></path>
      <path d="m17.2 8 1.6-1.6"></path>
    </svg>
  `;
}

  const toggle =
    document.getElementById('themeToggle');

  if (toggle) {

    toggle.checked =
      safeTheme === 'light';

  }

}


function toggleTheme() {

  const nextTheme =
    getSavedTheme() === 'dark'
      ? 'light'
      : 'dark';

  applyTheme(nextTheme);

  const label =
    document.getElementById('themeLabel');

  if (label) {

    label.textContent =
      nextTheme === 'light'
        ? 'Світла'
        : 'Темна';

  }

}

function setThemeMode(mode) {
  const safeMode = ['auto', 'light', 'dark'].includes(mode)
    ? mode
    : 'auto';

  localStorage.setItem('motoTheme', safeMode);
  applyTheme(safeMode === 'auto' ? getSystemTheme() : safeMode, false);

  const label = document.getElementById('themeLabel');
  if (label) {
    label.textContent = safeMode === 'auto'
      ? `Автоматично (${getSavedTheme() === 'dark' ? 'темна' : 'світла'})`
      : safeMode === 'light' ? 'Світла' : 'Темна';
  }
}

if (systemThemeQuery) {
  systemThemeQuery.addEventListener('change', function() {
    if (getThemeMode() === 'auto') {
      applyTheme(getSystemTheme(), false);
      const label = document.getElementById('themeLabel');
      if (label) {
        label.textContent = `Автоматично (${getSavedTheme() === 'dark' ? 'темна' : 'світла'})`;
      }
    }
  });
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}

// =========================================================
// GPS
// =========================================================

function findMe() {
  if (!navigator.geolocation) {
    alert('Ваш браузер не підтримує геолокацію.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Переміщуємо карту до поточного місцезнаходження
      map.flyTo({
        center: [lng, lat],
        zoom: 15
      });

      // Створюємо елемент маркера
      if (!myMarker) {
        const markerElement = document.createElement('div');

        markerElement.className = 'my-location-marker';
        markerElement.innerHTML =
          '<div class="my-location-dot"></div>';

        myMarker = new maplibregl.Marker({
          element: markerElement,
          anchor: 'center'
        })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 16 })
              .setText('🏍️ Ви тут')
          )
          .addTo(map);

        myMarker.togglePopup();
      } else {
        // Оновлюємо позицію наявного маркера
        myMarker.setLngLat([lng, lat]);
      }
    },

    function(error) {
      console.error('Геолокація:', error);

      if (error.code === 1) {
        alert('Дозвольте доступ до геолокації у браузері.');
      } else if (error.code === 2) {
        alert('Не вдалося визначити ваше місцезнаходження.');
      } else if (error.code === 3) {
        alert('Час очікування GPS вичерпано. Спробуйте ще раз.');
      } else {
        alert('Помилка визначення місцезнаходження.');
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function getCurrentCoordinates() {
  return new Promise(function(resolve, reject) {
    if (!navigator.geolocation) {
      reject(new Error('Браузер не підтримує геолокацію.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(position) {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      function(error) {
        const messages = {
          1: 'Дозвольте доступ до геолокації, щоб побудувати маршрут.',
          2: 'Не вдалося визначити місцезнаходження.',
          3: 'GPS не відповів вчасно. Спробуйте ще раз.'
        };
        reject(new Error(messages[error.code] || 'Не вдалося отримати координати GPS.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  });
}

function addActiveRouteLayer() {
  if (!activeRouteGeoJSON || !map.isStyleLoaded()) return;

  if (map.getLayer('active-ride-route')) {
    map.removeLayer('active-ride-route');
  }
  if (map.getSource('active-ride-route')) {
    map.removeSource('active-ride-route');
  }

  map.addSource('active-ride-route', {
    type: 'geojson',
    data: activeRouteGeoJSON
  });

  const firstSymbolLayer = map.getStyle().layers.find(function(layer) {
    return layer.type === 'symbol';
  });

  const routeLayer = {
    id: 'active-ride-route',
    type: 'line',
    source: 'active-ride-route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#18d9dc',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        8, 4,
        15, 7
      ],
      'line-opacity': 0.95
    }
  };

  if (firstSymbolLayer) {
    map.addLayer(routeLayer, firstSymbolLayer.id);
  } else {
    map.addLayer(routeLayer);
  }
}

async function routeToRide(lat, lng) {
  const destination = { lat: Number(lat), lng: Number(lng) };
  if (
    !Number.isFinite(destination.lat) ||
    !Number.isFinite(destination.lng) ||
    Math.abs(destination.lat) > 90 ||
    Math.abs(destination.lng) > 180
  ) {
    activeRouteDestination = null;
    alert('Для цієї поїздки не задано координати точки збору.');
    return;
  }

  if (currentScreen !== 'map') {
    showMap();
  }

  activeRouteDestination = destination;

  const requestId = ++routeRequestSerial;
  activeRouteGeoJSON = null;
  activeRouteOrigin = null;
  if (map.getLayer('active-ride-route')) map.removeLayer('active-ride-route');
  if (map.getSource('active-ride-route')) map.removeSource('active-ride-route');

  try {
    const origin = await getCurrentCoordinates();
    if (requestId !== routeRequestSerial) return;
    activeRouteOrigin = origin;

    if (!myMarker) {
      const markerElement = document.createElement('div');
      markerElement.className = 'my-location-marker';
      markerElement.innerHTML = '<div class="my-location-dot"></div>';
      myMarker = new maplibregl.Marker({ element: markerElement, anchor: 'center' })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map);
    } else {
      myMarker.setLngLat([origin.lng, origin.lat]);
    }

    const routeUrl =
      'https://router.project-osrm.org/route/v1/driving/' +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      '?overview=full&geometries=geojson&steps=false';
    const response = await fetch(routeUrl);
    if (!response.ok) throw new Error('Сервіс маршрутів тимчасово недоступний.');

    const result = await response.json();
    if (requestId !== routeRequestSerial) return;
    if (result.code !== 'Ok' || !result.routes || !result.routes.length) {
      throw new Error('Не вдалося знайти автомобільний маршрут до точки збору.');
    }

    const route = result.routes[0];
    activeRouteGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: route.geometry
    };
    addActiveRouteLayer();

    const bounds = new maplibregl.LngLatBounds();
    route.geometry.coordinates.forEach(function(coordinate) {
      bounds.extend(coordinate);
    });
    map.fitBounds(bounds, {
      padding: { top: 100, right: 70, bottom: 150, left: 50 },
      maxZoom: 15,
      duration: 700
    });
  } catch (error) {
    if (requestId !== routeRequestSerial) return;
    console.error('Помилка побудови маршруту:', error);
    alert(`${error.message} Скористайтеся кнопкою G для маршруту в Google Maps.`);
  }
}

function openGoogleMapsRoute() {
  if (!activeRouteDestination) return;

  const params = new URLSearchParams({
    api: '1',
    destination: `${activeRouteDestination.lat},${activeRouteDestination.lng}`,
    travelmode: 'driving',
    dir_action: 'navigate'
  });

  if (activeRouteOrigin) {
    params.set('origin', `${activeRouteOrigin.lat},${activeRouteOrigin.lng}`);
  }

  window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener');
}

// =========================================================
// NAVIGATION
// =========================================================

function hideMapInterface() {

  closeRideDetailSheet();

  const ids = [

    'mapHeader',
    'mapSidebar',
    'mapSearchBox',
    'mapFilters',
    'weatherButton',
    'mapControls',
    'mapAddButton'

  ];


  ids.forEach(function(id) {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.display =
        'none';

    }

  });

}


function showMapInterface() {

  const elements = {

    mapHeader:
      'block',

    mapSidebar:
      'flex',

    mapSearchBox:
      'flex',

    mapFilters:
      'flex',

    weatherButton:
      'flex',

    mapControls:
      'flex',

    mapAddButton:
      'flex',

    bottomNav:
      'grid'

  };


  Object.keys(elements)
    .forEach(function(id) {

      const element =
        document.getElementById(id);

      if (element) {

        element.style.display =
          elements[id];

      }

    });

}


function hideAllScreens() {

  [
    'rides',
    'profile',
    'settings'
  ]
  .forEach(function(id) {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.display =
        'none';

    }

  });

}


function setActiveNav(name) {

  document
    .querySelectorAll('.nav-item')
    .forEach(function(item) {

      item.classList.remove(
        'active'
      );

    });


  const navIds = {
    map: 'navMap',
    routes: 'navRoutes',
    create: 'navCreateRide',
    community: 'navCommunity',
    profile: 'navProfile'
  };
  const target = document.getElementById(navIds[name]);


  if (target) {

    target.classList.add(
      'active'
    );

  }

}


function showCloseButton() {

  const button =
    document.getElementById(
      'backButton'
    );

  if (button) {

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';

  }

}


function hideCloseButton() {

  const button =
    document.getElementById(
      'backButton'
    );

  if (button) {

    button.style.display =
      'none';

  }

}

// =========================================================
// ЗАКРИТТЯ ПОТОЧНОГО ЕКРАНУ
// =========================================================

function closeCurrentScreen() {

  if (currentScreen === 'rides') {
    showMap();
    return;
  }

  if (currentScreen === 'profile') {
    showMap();
    return;
  }

  if (currentScreen === 'settings') {
    showProfile();
    return;
  }

  showMap();
}


function showMap() {

  currentScreen = 'map';

  hideAllScreens();

  hideCloseButton();

  showMapInterface();

  setActiveNav('map');

  loadRideMarkersFromSupabase();

  setTimeout(function() {

  map.resize();

  }, 100);

}

function showSuccessMessage(message) {

  const messageBox =
    document.createElement('div');

  messageBox.className =
    'success-message';

  messageBox.textContent =
    message;

  document.body.appendChild(
    messageBox
  );

  setTimeout(() => {

    messageBox.remove();

  }, 2500);

}

// =========================================================
// ЕКРАН МОТОПОЇЗДОК
// =========================================================

function prepareRidesScreen(title, navItem) {
  closeModal();
  currentScreen = 'rides';
  setActiveNav(navItem || 'routes');
  hideAllScreens();
  hideMapInterface();

  const rides = document.getElementById('rides');
  if (!rides) {
    console.error('Елемент #rides не знайдено.');
    return null;
  }

  rides.style.display = 'block';
  const ridesTitle = rides.querySelector('.rides-screen-header h1');
  if (ridesTitle) ridesTitle.textContent = title || 'МОТОПОЇЗДКИ';
  return document.getElementById('ridesList');
}

function showRides() {
  const list = prepareRidesScreen('МОТОПОЇЗДКИ', 'routes');
  if (!list) return;

  list.classList.remove('community-list');
  loadRidesFromSupabase()
    .then(function(ridesFromSupabase) {
      renderRides(ridesFromSupabase || []);
    })
    .catch(function(error) {
      console.error('Помилка завантаження мотопоїздок:', error);
      list.innerHTML = '<div class="empty-state"><h3>Не вдалося завантажити мотопоїздки</h3><p>Спробуйте ще раз.</p></div>';
    });
}

// Маршрути та спільнота показують живий перелік відкритих поїздок;
// вибір поїздки відкриває її точку збору й доступні способи маршруту.
function showRoutes() {
  const list = prepareRidesScreen('МАРШРУТИ', 'routes');
  if (!list) return;

  list.classList.remove('community-list');
  loadRidesFromSupabase()
    .then(function(ridesFromSupabase) {
      renderRides(ridesFromSupabase || []);
    })
    .catch(function(error) {
      console.error('Помилка завантаження маршрутів:', error);
      list.innerHTML = '<div class="empty-state"><h3>Не вдалося завантажити маршрути</h3><p>Спробуйте ще раз.</p></div>';
    });
}

function showCommunity() {
  const list = prepareRidesScreen('СПІЛЬНОТА', 'community');
  if (!list) return;

  list.classList.add('community-list');
  list.innerHTML = '<div class="empty-state"><p>Завантажую зареєстрованих райдерів…</p></div>';
  loadCommunityRiders()
    .then(function(riders) {
      renderCommunityRiders(riders, list);
    })
    .catch(function(error) {
      console.error('Помилка завантаження спільноти:', error);
      list.innerHTML = '<div class="empty-state"><h3>Не вдалося завантажити райдерів</h3><p>Перевір підключення та доступ до профілів у базі даних.</p></div>';
    });
}

async function loadCommunityRiders() {
  if (!supabaseClient) throw new Error('Supabase не підключено.');
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, nickname, bike, phone')
    .order('nickname', { ascending: true });
  if (error) throw error;
  return data || [];
}

function renderCommunityRiders(riders, list) {
  list.replaceChildren();
  list.classList.add('community-list');

  if (!riders.length) {
    list.innerHTML = '<div class="empty-state"><h3>Поки немає зареєстрованих райдерів</h3></div>';
    return;
  }

  riders.forEach(function(rider) {
    const card = document.createElement('article');
    card.className = 'community-rider';

    const identity = document.createElement('div');
    identity.className = 'community-rider-identity';
    const name = document.createElement('strong');
    name.className = 'community-rider-name';
    name.textContent = rider.nickname || 'Moto Rider';
    const bike = document.createElement('span');
    bike.className = 'community-rider-bike';
    bike.textContent = rider.bike || 'Мотоцикл не вказано';
    identity.append(name, bike);

    const actions = document.createElement('div');
    actions.className = 'community-rider-actions';
    const phone = String(rider.phone || '').replace(/[^\d+*#,;]/g, '');

    const message = document.createElement('button');
    message.type = 'button';
    message.className = 'community-contact-button';
    message.setAttribute('aria-label', 'Повідомлення: ' + (rider.nickname || 'Moto Rider'));
    message.title = 'Відкрити особистий чат';
    message.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/></svg>';
    message.addEventListener('click', function() {
      openCommunityChat(rider);
    });

    const call = document.createElement(phone ? 'a' : 'button');
    call.className = 'community-contact-button';
    call.setAttribute('aria-label', 'Зателефонувати: ' + (rider.nickname || 'Moto Rider'));
    call.title = phone ? 'Зателефонувати' : 'Номер телефону не вказано';
    call.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L8.1 11a16 16 0 0 0 4.9 4.9l1.8-1.8a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.7 2z"/></svg>';

    if (phone) {
      call.href = 'tel:' + phone;
    } else {
      call.type = 'button';
      call.addEventListener('click', function() {
        showSuccessMessage('Користувач не надав номер телефону. Напишіть йому в особистий чат.');
      });
    }

    actions.append(message, call);
    card.append(identity, actions);
    list.appendChild(card);
  });
}

async function openCommunityChat(rider) {
  if (!supabaseClient) {
    showSuccessMessage('Чат недоступний: немає підключення до бази даних.');
    return;
  }

  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !sessionData.session) {
    openAuthModal();
    return;
  }

  if (!rider.id || rider.id === sessionData.session.user.id) {
    showSuccessMessage('Не можна відкрити чат із власним профілем.');
    return;
  }

  currentDirectChat = {
    userId: sessionData.session.user.id,
    peerId: rider.id,
    nickname: rider.nickname || 'Moto Rider'
  };

  const dialog = document.getElementById('communityChatDialog');
  if (!dialog) return;
  document.getElementById('communityChatName').textContent = currentDirectChat.nickname;
  document.getElementById('communityChatBike').textContent = rider.bike || 'Мотоцикл не вказано';
  document.getElementById('communityChatMessages').innerHTML = '<p class="community-chat-empty">Завантажую повідомлення…</p>';

  if (!dialog.dataset.cleanupBound) {
    dialog.addEventListener('close', function() {
      if (directChatPollTimer) clearInterval(directChatPollTimer);
      directChatPollTimer = null;
      currentDirectChat = null;
    });
    dialog.dataset.cleanupBound = 'true';
  }

  if (!dialog.open) dialog.showModal();
  await loadDirectMessages();
  if (directChatPollTimer) clearInterval(directChatPollTimer);
  directChatPollTimer = setInterval(loadDirectMessages, 6000);
}

function closeCommunityChat() {
  const dialog = document.getElementById('communityChatDialog');
  if (dialog && dialog.open) dialog.close();
}

async function loadDirectMessages() {
  if (!currentDirectChat || directChatLoading) return;
  directChatLoading = true;
  const chat = currentDirectChat;
  const { data, error } = await supabaseClient
    .from('direct_messages')
    .select('id, sender_id, recipient_id, body, created_at')
    .or(`and(sender_id.eq.${chat.userId},recipient_id.eq.${chat.peerId}),and(sender_id.eq.${chat.peerId},recipient_id.eq.${chat.userId})`)
    .order('created_at', { ascending: true })
    .limit(200);
  directChatLoading = false;

  if (currentDirectChat !== chat) return;
  if (error) {
    console.error('Помилка завантаження повідомлень:', error);
    const messages = document.getElementById('communityChatMessages');
    messages.innerHTML = '<p class="community-chat-empty">Не вдалося завантажити чат. Перевірте, чи створена таблиця direct_messages у Supabase.</p>';
    return;
  }

  const messages = document.getElementById('communityChatMessages');
  messages.replaceChildren();
  if (!data || !data.length) {
    const empty = document.createElement('p');
    empty.className = 'community-chat-empty';
    empty.textContent = 'Почніть розмову — надішліть перше повідомлення.';
    messages.appendChild(empty);
    return;
  }

  data.forEach(function(item) {
    const bubble = document.createElement('div');
    bubble.className = 'community-chat-bubble' + (item.sender_id === chat.userId ? ' is-mine' : '');
    const body = document.createElement('p');
    body.textContent = item.body;
    const time = document.createElement('time');
    time.dateTime = item.created_at;
    time.textContent = new Intl.DateTimeFormat('uk-UA', {
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(item.created_at));
    bubble.append(body, time);
    messages.appendChild(bubble);
  });
  messages.scrollTop = messages.scrollHeight;
}

async function sendDirectMessage(event) {
  event.preventDefault();
  if (!currentDirectChat) return;

  const input = document.getElementById('communityChatInput');
  const body = input.value.trim();
  if (!body) return;

  const chat = currentDirectChat;
  const sendButton = event.currentTarget.querySelector('button[type="submit"]');
  sendButton.disabled = true;
  const { error } = await supabaseClient
    .from('direct_messages')
    .insert({
      sender_id: chat.userId,
      recipient_id: chat.peerId,
      body: body
    });
  sendButton.disabled = false;

  if (error) {
    console.error('Помилка надсилання повідомлення:', error);
    showSuccessMessage('Не вдалося надіслати. Перевірте налаштування чату в Supabase.');
    return;
  }

  input.value = '';
  await loadDirectMessages();
}
async function joinRide(rideId) {

  if (!supabaseClient) {

    alert(
      'Supabase не підключено.'
    );

    return;

  }


  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();


  if (
    sessionError ||
    !sessionData.session
  ) {

    alert(
      'Потрібно увійти в акаунт.'
    );

    return;

  }


  const user =
    sessionData.session.user;


  const {
    data: existingParticipant,
    error: checkError
  } =
    await supabaseClient
      .from('ride_participants')
      .select('id')
      .eq('ride_id', rideId)
      .eq('user_id', user.id)
      .maybeSingle();


  if (checkError) {

    console.error(
      'Помилка перевірки участі:',
      checkError
    );

    alert(
      'Не вдалося перевірити участь.'
    );

    return;

  }


  if (existingParticipant) {

    alert(
      'Ви вже приєдналися до цієї мотопоїздки.'
    );

    return;

  }


  const {
    error: insertError
  } =
    await supabaseClient
      .from('ride_participants')
      .insert({

        ride_id:
          rideId,

        user_id:
          user.id,

        status:
          'joined'

      });


  if (insertError) {

    console.error(
      'Помилка приєднання до мотопоїздки:',
      insertError
    );

    alert(
      'Не вдалося приєднатися до мотопоїздки: ' +
      insertError.message
    );

    return;

  }


  alert(
    '🏍️ Ви приєдналися до мотопоїздки!'
  );

}

function goBack() {

  if (currentScreen === 'settings') {

    showProfile();

    return;

  }


  if (currentScreen === 'profile') {

    showMap();

    return;

  }


  showMap();

}


// =========================================================
// MAP FILTERS
// =========================================================

function showMapFilters() {

  const filters =
    document.getElementById(
      'mapFilters'
    );


  if (!filters) return;


  if (
    filters.style.display ===
    'none'
  ) {

    filters.style.display =
      'flex';

  } else {

    filters.style.display =
      'none';

  }

}


function toggleMapFilter(button) {

  button.classList.toggle(
    'active'
  );

}


// =========================================================
// MODAL — CREATE RIDE
// =========================================================

function openModal() {

  setActiveNav('create');

  const modal =
    document.getElementById(
      'modal'
    );


  if (!modal) return;


  modal.style.display =
    'flex';


  const date =
    document.getElementById(
      'rideDate'
    );


  const time =
    document.getElementById(
      'rideTime'
    );


  if (date) {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      )
      .padStart(2, '0');

    const day =
      String(
        now.getDate()
      )
      .padStart(2, '0');


    date.min =
      `${year}-${month}-${day}`;

  }


  if (time && !time.value) {

    time.value =
      '20:00';

  }

}


function closeModal() {

  const modal =
    document.getElementById(
      'modal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

  const screenNav = {
    map: 'map',
    rides: 'routes',
    profile: 'profile',
    settings: 'profile'
  };
  setActiveNav(screenNav[currentScreen] || 'map');

}


/// =========================================================
// MEETING LOCATION
// =========================================================

function setMeetingLocation(lat, lng, label) {
  meetingLocation = {
    lat: Number(lat),
    lng: Number(lng),
    label: label || 'Точка збору'
  };

  if (meetingMarker) {
    meetingMarker.setLngLat([
      Number(lng),
      Number(lat)
    ]);
  } else {
    const markerElement = document.createElement('div');

    markerElement.className = 'meeting-marker';
    markerElement.textContent = '🏍️';

    meetingMarker = new maplibregl.Marker({
      element: markerElement,
      anchor: 'center',
      draggable: true
    })
      .setLngLat([
        Number(lng),
        Number(lat)
      ])
      .addTo(map);

    meetingMarker.on('dragend', function() {
      const position = meetingMarker.getLngLat();

      meetingLocation.lat = position.lat;
      meetingLocation.lng = position.lng;
      meetingLocation.label = 'Точка на карті';

      updateLocationStatus();
    });
  }

  const popup = new maplibregl.Popup({
    offset: 16
  }).setText('📍 ' + meetingLocation.label);

  meetingMarker.setPopup(popup);

  updateLocationStatus();
}

function chooseLocation() {
  choosingLocation = true;
  showMap();
  closeModal();
  showSuccessMessage('Натисніть на карті, щоб позначити місце збору.');
}

// Клік по карті

map.on(
  'click',
  function(event) {

    if (!choosingLocation) {
      return;
    }


    const lat =
      event.lngLat.lat;

    const lng =
      event.lngLat.lng;


    setMeetingLocation(
      lat,
      lng,
      'Точка на карті'
    );


    choosingLocation =
      false;


    openModal();

  }
);


// =========================================================
// SEARCH ADDRESS
// =========================================================

async function searchMeetingAddress() {

  const input =
    document.getElementById(
      'rideAddress'
    );


  const results =
    document.getElementById(
      'addressResults'
    );


  if (!input || !results) {
    return;
  }


  const query =
    input.value.trim();


  if (!query) {

    alert(
      'Введіть адресу або місце.'
    );

    return;

  }


  results.innerHTML =
    '<div class="address-result">🔎 Пошук...</div>';

  results.style.display =
    'block';


  try {

    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({

        q:
          query,

        format:
          'json',

        addressdetails:
          '1',

        limit:
          '5',

        'accept-language':
          'uk'

      });


    const response =
      await fetch(url, {

        headers: {

          'Accept':
            'application/json'

        }

      });


    if (!response.ok) {

      throw new Error(
        'Помилка пошуку'
      );

    }


    const data =
      await response.json();


    if (!data.length) {

      results.innerHTML =
        '<div class="address-result">Нічого не знайдено.</div>';

      return;

    }


    results.innerHTML =
      '';


    data.forEach(function(place) {

      const button =
        document.createElement(
          'button'
        );


      button.type =
        'button';

      button.className =
        'address-result';

      button.textContent =
        place.display_name;


      button.onclick =
        function() {

          selectAddressResult(
            place
          );

        };


      results.appendChild(
        button
      );

    });

  } catch (error) {

    console.error(
      error
    );


    results.innerHTML =
      '<div class="address-result">Не вдалося виконати пошук.</div>';

  }

}


function selectAddressResult(
  place
) {

  const lat =
    Number(place.lat);

  const lng =
    Number(place.lon);

  const label =
    place.display_name;


  setMeetingLocation(
    lat,
    lng,
    label
  );


  map.flyTo({
    center: [lng, lat],
    zoom: 16
  });


  meetingMarker.openPopup();


  const input =
    document.getElementById(
      'rideAddress'
    );


  const results =
    document.getElementById(
      'addressResults'
    );


  if (input) {

    input.value =
      label;

  }


  if (results) {

    results.style.display =
      'none';

  }

}


// =========================================================
// SAVE RIDE
// =========================================================

function getRides() {

  try {

    return JSON.parse(
      localStorage.getItem(
        'motoRides'
      )
    ) || [];

  } catch (error) {

    return [];

  }

}


async function loadRidesFromSupabase() {

  if (!supabaseClient) {

    return [];

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('rides')
      .select('*')
      .eq('status', 'open')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Помилка завантаження мотопоїздок:',
      error
    );

    return [];

  }


  return data || [];

}


function increaseUnreadRides() {

  const count =
    getUnreadRides() + 1;

  localStorage.setItem(
    'unreadRides',
    count
  );

}

async function getUnreadRides() {

  if (!supabaseClient) return 0;

  const {
    data: sessionData,
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    return 0;
  }

  const user = sessionData.session.user;

  const {
    count,
    error
  } = await supabaseClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error(
      'Помилка завантаження сповіщень:',
      error
    );
    return 0;
  }

  return count || 0;
}


function increaseUnreadRides() {

  const count =
    getUnreadRides() + 1;

  localStorage.setItem(
    'unreadRides',
    count
  );

}

async function updateNotificationsBadge() {

  const badge =
    document.getElementById(
      'notificationsBadge'
    );

  if (!badge) return;

  const count =
    await getUnreadRides();

  const button = document.getElementById('notificationsButton');
  const hasUnread = count > 0;

  if (button) {
    button.classList.toggle('has-unread', hasUnread);
    button.setAttribute(
      'aria-label',
      hasUnread
        ? `Сповіщення, нових: ${count}`
        : 'Сповіщення'
    );
  }

  badge.textContent =
    count;

  badge.hidden =
    count === 0;

}

function saveRides(rides) {

  localStorage.setItem(
    'motoRides',
    JSON.stringify(rides)
  );

}


async function saveRide() {

  const name =
    document.getElementById(
      'rideName'
    ).value.trim();


  const date =
    document.getElementById(
      'rideDate'
    ).value;


  const time =
    document.getElementById(
      'rideTime'
    ).value;


  if (!name) {

    alert(
      'Вкажіть назву мотопоїздки.'
    );

    return;

  }


  if (!date) {

    alert(
      'Оберіть дату.'
    );

    return;

   }
    const today = new Date();
    const todayYear =
     today.getFullYear();

const todayMonth =
  String(today.getMonth() + 1).padStart(2, '0');

const todayDay =
  String(today.getDate()).padStart(2, '0');

const todayString =
  `${todayYear}-${todayMonth}-${todayDay}`;


if (date < todayString) {

  alert(
    'Не можна обрати дату в минулому.'
  );

  return;

}
 


  if (!time) {

    alert(
      'Оберіть час.'
    );

    return;

  }


  if (!meetingLocation) {

    alert(
      'Оберіть точку збору.'
    );

    return;

  }


  if (!supabaseClient) {

    alert(
      'Supabase не підключено.'
    );

    return;

  }


  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();


  if (
    sessionError ||
    !sessionData.session
  ) {

    alert(
      'Потрібно увійти в акаунт.'
    );

    return;

  }


const user = sessionData.session.user;

const {
  data: profileData,
  error: profileError
} = await supabaseClient
  .from('profiles')
  .select('nickname, bike')
  .eq('id', user.id)
  .single();

if (profileError) {
  console.error(
    'Помилка завантаження профілю:',
    profileError
  );

  alert(
    'Не вдалося завантажити профіль: ' +
    profileError.message
  );

  return;
}


  const {
    data: savedRide,
    error
  } =
    await supabaseClient
      .from('rides')
      .insert({

        creator_id:
          user.id,

        name:
          name,

        description:
          null,

        ride_date:
          date,

        ride_time:
          time,

        meeting_lat:
          meetingLocation.lat,

        meeting_lng:
          meetingLocation.lng,

        max_people:
          100,

        status:
          'open'

      })
      .select()
      .single();


  if (error) {

    console.error(
      'Помилка створення мотопоїздки:',
      error
    );

    alert(
      'Не вдалося створити мотопоїздку: ' +
      error.message
    );

    return;

  }


  const rides =
    getRides();


  const ride = {

    id:
      savedRide.id,

    name:
      savedRide.name,

    date:
      savedRide.ride_date,

    time:
      savedRide.ride_time,

    location:
      meetingLocation.label,

    lat:
      savedRide.meeting_lat,

    lng:
      savedRide.meeting_lng,

    creator:
      profile.nickname ||
      'Moto Rider',

    riders: [

      {

        name:
          profileData.nickname||
          'Moto Rider',

        bike:
          profileData.bike||
          'Мотоцикл не вказано'

      }

    ]

  };


  rides.unshift(
    ride
  );


  saveRides(
    rides
  );


  increaseUnreadRides();

  updateNotificationsBadge();


  closeModal();

  renderRideMarkers();

  showMap();


  showSuccessMessage(
    '🏍️ Мотопоїздку створено!'
  );

}

// =========================================================
// RIDE MARKERS
// =========================================================

function clearRideMarkers() {
  rideMarkers.forEach(function(marker) {
    marker.remove();
  });

  rideMarkers = [];
}

function closeRideDetailSheet() {
  const sheet = document.getElementById('rideDetailSheet');
  if (!sheet || sheet.hidden) return;

  sheet.classList.remove('is-open');
  sheet.setAttribute('aria-hidden', 'true');
  setTimeout(function() {
    if (!sheet.classList.contains('is-open')) {
      sheet.hidden = true;
    }
  }, 220);
}

function showRideMapPopup(ride, longitude, latitude) {
  if (activeRidePopup) {
    activeRidePopup.remove();
    activeRidePopup = null;
  }

  const content = document.createElement('div');
  content.className = 'ride-map-popup';

  const creator = document.createElement('strong');
  creator.className = 'ride-map-popup-creator';
  creator.textContent = ride.creatorName || ride.creator || 'Moto Rider';

  const details = document.createElement('div');
  details.className = 'ride-map-popup-details';

  const date = document.createElement('span');
  date.textContent = ride.ride_date || ride.date
    ? formatDate(ride.ride_date || ride.date)
    : 'Дата не вказана';

  const time = document.createElement('span');
  time.textContent = ride.ride_time || ride.time || 'Час не вказано';

  details.append(date, time);
  content.append(creator, details);

  activeRidePopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: true,
    offset: 14,
    maxWidth: '260px',
    className: 'ride-map-popup-container'
  })
    .setLngLat([longitude, latitude])
    .setDOMContent(content)
    .addTo(map);

  activeRidePopup.on('close', function() {
    activeRidePopup = null;
  });
}

function showRideDetailSheet(ride) {
  const sheet = document.getElementById('rideDetailSheet');
  if (!sheet) return;

  const rideName = ride.name || 'Мотопоїздка';
  const rideDate = ride.ride_date || ride.date;
  const rideTime = ride.ride_time || ride.time;
  const creatorName = ride.creatorName || ride.creator || 'Moto Rider';
  const latitude = Number(
    ride.meeting_lat !== undefined && ride.meeting_lat !== null
      ? ride.meeting_lat
      : ride.lat
  );
  const longitude = Number(
    ride.meeting_lng !== undefined && ride.meeting_lng !== null
      ? ride.meeting_lng
      : ride.lng
  );

  document.getElementById('rideDetailName').textContent = rideName;
  document.getElementById('rideDetailCreator').textContent = creatorName;
  document.getElementById('rideDetailDate').textContent = rideDate ? formatDate(rideDate) : 'Не вказано';
  document.getElementById('rideDetailTime').textContent = rideTime || 'Не вказано';

  const actions = document.getElementById('rideDetailActions');
  actions.innerHTML =
    `<button type="button" class="ride-popup-action ride-popup-join" ${ride.id ? '' : 'disabled'}>` +
      `<svg class="ride-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>` +
      `<span>Приєднатися</span>` +
    `</button>` +
    `<button type="button" class="ride-popup-action ride-popup-google" title="Прокласти маршрут у Google Maps" aria-label="Прокласти маршрут у Google Maps">` +
      `<span class="ride-provider-mark ride-provider-google" aria-hidden="true">G</span>` +
    `</button>` +
    `<button type="button" class="ride-popup-action ride-popup-moto" title="Прокласти маршрут у Moto Maps" aria-label="Прокласти маршрут у Moto Maps">` +
      `<span class="ride-provider-mark ride-provider-moto" aria-hidden="true">MM</span>` +
    `</button>`;

  const joinButton = actions.querySelector('.ride-popup-join');
  if (joinButton && ride.id) {
    joinButton.addEventListener('click', function() {
      joinRide(ride.id);
    });
  }

  const googleButton = actions.querySelector('.ride-popup-google');
  if (googleButton) {
    googleButton.addEventListener('click', function() {
      closeRideDetailSheet();
      routeToRide(latitude, longitude);
      openGoogleMapsRoute();
    });
  }

  const motoButton = actions.querySelector('.ride-popup-moto');
  if (motoButton) {
    motoButton.addEventListener('click', function() {
      closeRideDetailSheet();
      routeToRide(latitude, longitude);
    });
  }

  sheet.hidden = false;
  sheet.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(function() {
    sheet.classList.add('is-open');
  });
}

async function loadRideMarkersFromSupabase() {

  if (!supabaseClient) {
    mapSidebarRides = [];
    renderMapSidebarRides();
    return;

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('rides')
      .select('*')
      .eq('status', 'open')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Помилка завантаження точок мотопоїздок:',
      error
    );

    const container = document.getElementById('mapSidebarRides');
    if (container) container.textContent = 'Не вдалося завантажити поїздки. Перевір підключення та спробуй ще раз.';

    return;

  }


  const rides = data || [];
  const creatorIds = Array.from(new Set(
    rides
      .map(function(ride) { return ride.creator_id; })
      .filter(Boolean)
  ));
  const creatorNames = {};

  if (creatorIds.length) {
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, nickname')
      .in('id', creatorIds);

    if (profileError) {
      console.error('Помилка завантаження авторів поїздок:', profileError);
    } else {
      (profiles || []).forEach(function(profile) {
        creatorNames[profile.id] = profile.nickname || 'Moto Rider';
      });
    }
  }


  mapSidebarRides = rides.filter(function(ride) {
    const lat = Number(ride.meeting_lat);
    const lng = Number(ride.meeting_lng);
    return ride.meeting_lat !== null && ride.meeting_lat !== undefined &&
      ride.meeting_lng !== null && ride.meeting_lng !== undefined &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }).map(function(ride) {
    ride.creatorName = creatorNames[ride.creator_id] || 'Moto Rider';
    return ride;
  });
  renderMapSidebarRides();


  clearRideMarkers();


  rides.forEach(function(ride) {

    if (
      typeof ride.meeting_lat !== 'number' ||
      typeof ride.meeting_lng !== 'number'
    ) {

      return;

    }


  ride.creatorName = creatorNames[ride.creator_id] || 'Moto Rider';

const markerElement = document.createElement('button');
markerElement.type = 'button';
markerElement.className = 'ride-map-marker';
markerElement.setAttribute('aria-label', 'Показати автора та час поїздки');

const marker = new maplibregl.Marker({
  element: markerElement,
  anchor: 'bottom'
  })
  .setLngLat([
    Number(ride.meeting_lng),
    Number(ride.meeting_lat)
  ])
  .addTo(map);

marker.getElement().addEventListener('click', function(event) {
  event.stopPropagation();
  showRideMapPopup(ride, Number(ride.meeting_lng), Number(ride.meeting_lat));
});


    rideMarkers.push(
      marker
    );

  });

}

function renderMapSidebarRides() {
  const container = document.getElementById('mapSidebarRides');
  if (!container) return;

  if (!mapSidebarRides.length) {
    container.innerHTML = '<div class="sidebar-empty-state">Поки немає відкритих поїздок поруч.<br>Створи першу та запроси інших райдерів.</div>';
    return;
  }

  container.replaceChildren();
  mapSidebarRides.slice(0, 12).forEach(function(ride) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sidebar-ride-card';

    const title = document.createElement('strong');
    title.className = 'sidebar-ride-title';
    title.textContent = ride.name || 'Мотопоїздка';

    const creator = document.createElement('span');
    creator.className = 'sidebar-ride-creator';
    creator.textContent = 'Створив: ' + (ride.creatorName || 'Moto Rider');

    const details = document.createElement('span');
    details.className = 'sidebar-ride-details';
    const date = ride.ride_date ? formatDate(ride.ride_date) : 'Дата не вказана';
    details.textContent = date + (ride.ride_time ? ' · ' + ride.ride_time : '');

    const location = document.createElement('span');
    location.className = 'sidebar-ride-location';
    location.textContent = ride.location || 'Місце збору на карті';

    const action = document.createElement('span');
    action.className = 'sidebar-ride-action';
    action.textContent = 'Переглянути поїздку →';

    card.append(title, creator, details, location, action);
    card.addEventListener('click', function() {
      map.easeTo({
        center: [Number(ride.meeting_lng), Number(ride.meeting_lat)],
        zoom: Math.max(map.getZoom(), 14),
        duration: 650
      });
      showRideDetailSheet(ride);
    });
    container.appendChild(card);
  });
}

function renderRideMarkers() {

  clearRideMarkers();


  const rides =
    getRides();


  rides.forEach(function(ride) {

    if (
      typeof ride.lat !== 'number' ||
      typeof ride.lng !== 'number'
    ) {

      return;

    }

const markerElement = document.createElement('button');
markerElement.type = 'button';
markerElement.className = 'ride-map-marker';
markerElement.setAttribute('aria-label', 'Показати автора та час поїздки');

const marker = new maplibregl.Marker({
  element: markerElement,
  anchor: 'bottom'
})
  .setLngLat([
    Number(ride.lng),
    Number(ride.lat)
  ])
  .addTo(map);

marker.getElement().addEventListener('click', function(event) {
  event.stopPropagation();
  showRideMapPopup(ride, Number(ride.lng), Number(ride.lat));
});

rideMarkers.push(marker);

});
}


// =========================================================
// ВІДОБРАЖЕННЯ МОТОПОЇЗДОК
// =========================================================

async function renderRides(ridesFromSupabase) {

  // Працюємо тільки з контейнером списку.
  // Сам екран #rides більше не перезаписуємо.
  const container =
    document.getElementById('ridesList');

  if (!container) return;

  const rides =
    ridesFromSupabase || [];

  let participantRows = [];
  let creatorProfiles = {};

  // =======================================================
  // УЧАСНИКИ
  // =======================================================

  if (
    supabaseClient &&
    rides.length
  ) {

    const rideIds =
      rides.map(function(ride) {
        return ride.id;
      });

    const {
      data,
      error
    } = await supabaseClient
      .from('ride_participants')
      .select(`
        ride_id,
        user_id,
        profiles (
          nickname,
          bike
        )
      `)
      .in(
        'ride_id',
        rideIds
      )
      .eq(
        'status',
        'joined'
      );

    if (error) {

      console.error(
        'Помилка завантаження учасників:',
        error
      );

    } else {

      participantRows =
        data || [];

    }

    // =====================================================
    // ПРОФІЛІ АВТОРІВ
    // =====================================================

    const creatorIds = [
      ...new Set(
        rides
          .map(function(ride) {
            return ride.creator_id;
          })
          .filter(Boolean)
      )
    ];

    if (creatorIds.length) {

      const {
        data: creatorData,
        error: creatorError
      } = await supabaseClient
        .from('profiles')
        .select(`
          id,
          nickname,
          bike
        `)
        .in(
          'id',
          creatorIds
        );

      if (creatorError) {

        console.error(
          'Помилка завантаження профілів авторів:',
          creatorError
        );

      } else {

        (creatorData || [])
          .forEach(function(profile) {

            creatorProfiles[profile.id] =
              profile;

          });

      }

    }

  }

  // =======================================================
  // НЕМАЄ МОТОПОЇЗДОК
  // =======================================================

  if (!rides.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-state-icon">
          🏍️
        </div>

        <h3>
          Поки немає мотопоїздок
        </h3>

        <p>
          Створи першу поїздку та збери свою компанію.
        </p>

        <button
          class="create-btn"
          type="button"
          onclick="openModal()"
        >
          + Створити мотопоїздку
        </button>

      </div>
    `;

    return;
  }

  // =======================================================
  // СПИСОК МОТОПОЇЗДОК
  // =======================================================

  let html = '';

  rides.forEach(function(ride) {

    const participants =
      participantRows.filter(
        function(item) {
          return item.ride_id === ride.id;
        }
      );

    const ridersCount =
      participants.length;

    // -----------------------------------------------------
    // ІМЕНА УЧАСНИКІВ
    // -----------------------------------------------------

    const riderNames =
      participants
        .map(function(item) {

          return (
            item.profiles &&
            item.profiles.nickname
          )
            ? item.profiles.nickname
            : 'Moto Rider';

        });

    let participantsHtml = '';

    if (riderNames.length) {

      participantsHtml = `
        <div class="ride-participants">

          <div class="ride-participants-title">
            👥 Учасники:
          </div>

          <div class="ride-participants-list">

            ${riderNames
              .map(function(name) {

                return `
                  <span class="ride-participant-name">
                    ${escapeHtml(name)}
                  </span>
                `;

              })
              .join('')}

          </div>

        </div>
      `;

    }

    // -----------------------------------------------------
    // АВТОР МОТОПОЇЗДКИ
    // -----------------------------------------------------

    const creator =
      creatorProfiles[ride.creator_id];

    const creatorName =
      creator && creator.nickname
        ? creator.nickname
        : 'Moto Rider';

    const creatorBike =
      creator && creator.bike
        ? creator.bike
        : 'Не вказано';

    const rideLatitude = Number(ride.meeting_lat);
    const rideLongitude = Number(ride.meeting_lng);
    const hasMeetingCoordinates =
      ride.meeting_lat !== null &&
      ride.meeting_lat !== undefined &&
      ride.meeting_lng !== null &&
      ride.meeting_lng !== undefined &&
      Number.isFinite(rideLatitude) &&
      Number.isFinite(rideLongitude) &&
      Math.abs(rideLatitude) <= 90 &&
      Math.abs(rideLongitude) <= 180;
    // -----------------------------------------------------
    // КАРТКА
    // -----------------------------------------------------

    html += `
      <article class="ride-card">

        <h3>
          🏍️ ${escapeHtml(ride.name)}
        </h3>

        <div class="ride-creator">
          👤 Створив:
          <strong>
            ${escapeHtml(creatorName)}
          </strong>
        </div>

        <div class="ride-bike">
          🏍️ Мотоцикл:
          <strong>
            ${escapeHtml(creatorBike)}
          </strong>
        </div>

        <div class="ride-meta">

          <div>
            📅
            ${escapeHtml(
              formatDate(
                ride.ride_date
              )
            )}
          </div>

          <div>
            🕐
            ${escapeHtml(
              ride.ride_time || ''
            )}
          </div>

          <div>
            🏍️
            ${ridersCount}
            учасн.
          </div>

        </div>

        <div class="ride-location">

          📍
          ${escapeHtml(
            ride.location ||
            'Точку збору не вказано'
          )}

        </div>

        ${participantsHtml}

        <div class="ride-actions">

          <button
            class="ride-action"
            type="button"
            onclick="showRideRiders('${ride.id}')"
          >
            👥 Мотоциклісти
          </button>

          <button
            class="ride-action"
            type="button"
            onclick="joinRide('${ride.id}')"
          >
            🏍️ Приєднатися
          </button>

          <button
            class="ride-action"
            type="button"
            onclick="openRideOnMap('${ride.id}')"
          >
            📍 На карті
          </button>

          <button
            class="ride-action"
            type="button"
            ${hasMeetingCoordinates ? '' : 'disabled'}
            onclick="routeToRide(${rideLatitude},${rideLongitude})"
          >
            🧭 Маршрут
          </button>

        </div>

      </article>
    `;

  });

  // =======================================================
  // ВИВОДИМО ТІЛЬКИ СПИСОК
  // =======================================================

  container.innerHTML = html;

}
// =========================================================
// RIDE HELPERS
// =========================================================

function formatDate(date) {

  if (!date) return '—';


  const parts =
    date.split('-');


  if (parts.length !== 3) {

    return date;

  }


  return (
    parts[2] +
    '.' +
    parts[1] +
    '.' +
    parts[0]
  );

}


function openRideOnMap(id) {

  const ride =
    getRides().find(
      function(item) {

        return Number(item.id) ===
          Number(id);

      }
    );


  if (!ride) return;


  if (
    typeof ride.lat !== 'number' ||
    typeof ride.lng !== 'number'
  ) {

    alert(
      'Для цієї поїздки координати ще не задані.'
    );

    return;

  }


  showMap();


  map.flyTo({
    center: [ride.lng, ride.lat],
    zoom: 16
  });


  const marker =
    rideMarkers.find(
      function(item) {

        const position =
          item.getLngLat();

        return (
          Math.abs(position.lat - ride.lat) < 0.000001 &&
          Math.abs(position.lng - ride.lng) < 0.000001
        );

      }
    );


  if (marker) {

    marker.openPopup();

  }

}


// =========================================================
// RIDERS
// =========================================================
async function loadRideParticipantCounts(rideIds) {

  if (!supabaseClient || !rideIds.length) {

    return {};

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('ride_participants')
      .select('ride_id')
      .in('ride_id', rideIds)
      .eq('status', 'joined');


  if (error) {

    console.error(
      'Помилка завантаження учасників:',
      error
    );

    return {};

  }


  const counts = {};


  (data || []).forEach(function(item) {

    if (!counts[item.ride_id]) {

      counts[item.ride_id] = 0;

    }


    counts[item.ride_id]++;

  });


  return counts;

}

function showRideRiders(id) {

  const ride =
    getRides().find(
      function(item) {

        return Number(item.id) ===
          Number(id);

      }
    );


  if (!ride) return;


  currentRidersRideId =
    id;


  const modal =
    document.getElementById(
      'ridersModal'
    );


  const list =
    document.getElementById(
      'ridersList'
    );


  const subtitle =
    document.getElementById(
      'ridersModalSubtitle'
    );


  if (!modal || !list) return;


  subtitle.textContent =
    ride.name;


  const riders =
    Array.isArray(ride.riders)
      ? ride.riders
      : [];


  if (!riders.length) {

    list.innerHTML = `
      <div class="empty-state">
        👥 Учасників поки немає.
      </div>
    `;

  } else {

    list.innerHTML =
      riders
        .map(function(rider) {

          return `

            <div class="profile-info-row">

              <span>
                🏍️
              </span>

              <strong>
                ${escapeHtml(rider.name)}
                <br>
                <small>
                  ${escapeHtml(rider.bike)}
                </small>
              </strong>

            </div>

          `;

        })
        .join('');

  }


  modal.style.display =
    'flex';

}


function closeRidersModal() {

  const modal =
    document.getElementById(
      'ridersModal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


// =========================================================
// PROFILE
// =========================================================

async function showProfile() {

  if (!supabaseClient) {
    openAuthModal();
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    openAuthModal();
    return;
  }

  profileReturnScreen =
    currentScreen === 'settings'
      ? 'profile'
      : 'map';

  currentScreen =
    'profile';

  setActiveNav('profile');

  hideAllScreens();
  hideMapInterface();

  hideCloseButton();

  const profile =
    document.getElementById('profile');

  if (!profile) return;

  profile.style.display =
    'block';

  await renderProfile();

}


// =========================================================
// RENDER PROFILE
// =========================================================

async function renderProfile() {

  const element =
    document.getElementById('profile');

  if (!element) return;

  if (!supabaseClient) {
    openAuthModal();
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    openAuthModal();
    return;
  }

  const user =
    sessionData.session.user;

  const {
    data: profileData,
    error: profileError
  } =
    await supabaseClient
      .from('profiles')
      .select(`
        id,
        nickname,
        avatar_url,
        city,
        about,
        phone,
        bike
      `)
      .eq('id', user.id)
      .single();

  if (profileError) {

    console.error(
      'Помилка завантаження профілю:',
      profileError
    );

    alert(
      'Не вдалося завантажити профіль: ' +
      profileError.message
    );

    return;
  }

const nickname =
  profileData.nickname ||
  'Moto Rider';

const avatar =
  profileData.avatar_url ||
  '';
  element.innerHTML = `

    <div class="profile-fullscreen">

      <div class="profile-header">

        <div>

          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h1>
            Вітаю,
            ${escapeHtml(nickname)}!
          </h1>

        </div>

        <button
          class="profile-close-button"
          type="button"
          onclick="showMap()"
          aria-label="Закрити"
        >
          ×
        </button>

      </div>


      <div class="profile-main">

        <button
          class="profile-avatar-button"
          type="button"
          onclick="changeProfileAvatar()"
          aria-label="Змінити аватар"
        >

          <div class="profile-avatar-large">

            ${
              avatar
                ? `
                  <img
                    src="${escapeHtml(avatar)}"
                    alt="Аватар"
                  >
                `
                : '🏍️'
            }

          </div>

        </button>


        <div class="profile-menu">


          <button
            class="profile-menu-item"
            type="button"
            onclick="showProfileDetails()"
          >

            <span class="profile-menu-icon">
              👤
            </span>

            <span class="profile-menu-text">
              Профіль
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


          <button
            class="profile-menu-item"
            type="button"
            onclick="showRides()"
          >

            <span class="profile-menu-icon">
              🏍️
            </span>

            <span class="profile-menu-text">
              Мої мотопоїздки
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


          <button
            class="profile-menu-item"
            type="button"
            onclick="showSecurity()"
          >

            <span class="profile-menu-icon">
              🔒
            </span>

            <span class="profile-menu-text">
              Безпека
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


          <button
            class="profile-menu-item"
            type="button"
            onclick="showSettings()"
          >

            <span class="profile-menu-icon">
              ⚙️
            </span>

            <span class="profile-menu-text">
              Налаштування
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


        </div>


        <button
          class="profile-logout-button"
          type="button"
          onclick="logoutUser()"
        >
          Вийти з акаунта
        </button>


      </div>

    </div>

  `;
}


// =========================================================
// PROFILE DETAILS
// =========================================================

async function editProfileField(field) {

  // Поки дозволяємо редагувати тільки ці поля
  if (
    field !== 'bike' &&
    field !== 'city' &&
    field !== 'about'
  ) {
    alert('Для цього поля ще потрібно додати підтвердження.');
    return;
  }

  if (!supabaseClient) {
    alert('Supabase не підключено.');
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    alert('Потрібно увійти в акаунт.');
    return;
  }

  const user = sessionData.session.user;

  const {
    data: profileData,
    error: profileError
  } = await supabaseClient
    .from('profiles')
    .select('bike, city, about')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error(
      'Помилка завантаження профілю:',
      profileError
    );

    alert('Не вдалося завантажити дані профілю.');
    return;
  }

  const fieldNames = {
    bike: 'Мотоцикл',
    city: 'Місто',
    about: 'Про себе'
  };

  const currentValue =
    profileData[field] || '';

  const newValue = prompt(
    fieldNames[field] + ':',
    currentValue
  );

  if (newValue === null) {
    return;
  }

  const value = newValue.trim();

  const {
    error: updateError
  } = await supabaseClient
    .from('profiles')
    .update({
      [field]: value || null
    })
    .eq('id', user.id);

  if (updateError) {
    console.error(
      'Помилка збереження профілю:',
      updateError
    );

    alert(
      'Не вдалося зберегти зміни: ' +
      updateError.message
    );

    return;
  }

  await showProfileDetails();
}


async function showProfileDetails() {

  const element =
    document.getElementById('profile');

  if (!element) {
    return;
  }

  if (!supabaseClient) {
    openAuthModal();
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    openAuthModal();
    return;
  }

  const user =
    sessionData.session.user;

  const {
    data: profileData,
    error: profileError
  } = await supabaseClient
    .from('profiles')
    .select(`
      nickname,
      bike,
      phone,
      city,
      about
    `)
    .eq('id', user.id)
    .single();

  if (profileError) {

    console.error(
      'Помилка завантаження даних профілю:',
      profileError
    );

    alert(
      'Не вдалося завантажити профіль: ' +
      profileError.message
    );

    return;
  }

  const email =
    user.email || 'Не вказано';

  element.innerHTML = `

    <div class="profile-fullscreen">

      <div class="profile-header">

        <div>
          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h1>
            Профіль
          </h1>
        </div>

        <button
          class="profile-close-button"
          type="button"
          onclick="showProfile()"
          aria-label="Назад"
        >
          ×
        </button>

      </div>


      <div class="profile-details">

        <button
          class="profile-detail-row"
          type="button"
          data-field="nickname"
          onclick="editProfileField('nickname')"
        >

          <span class="profile-detail-icon">
            👤
          </span>

          <span class="profile-detail-content">

            <strong>
              Нікнейм
            </strong>

            <small>
              ${escapeHtml(
                profileData.nickname ||
                'Moto Rider'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="bike"
          onclick="editProfileField('bike')"
        >

          <span class="profile-detail-icon">
            🏍️
          </span>

          <span class="profile-detail-content">

            <strong>
              Мотоцикл
            </strong>

            <small>
              ${escapeHtml(
                profileData.bike ||
                'Поки не вказано'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="phone"
          onclick="editProfileField('phone')"
        >

          <span class="profile-detail-icon">
            📱
          </span>

          <span class="profile-detail-content">

            <strong>
              Телефон
            </strong>

            <small>
              ${escapeHtml(
                profileData.phone ||
                user.phone ||
                'Не вказано'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="city"
          onclick="editProfileField('city')"
        >

          <span class="profile-detail-icon">
            🏙️
          </span>

          <span class="profile-detail-content">

            <strong>
              Місто
            </strong>

            <small>
              ${escapeHtml(
                profileData.city ||
                'Не вказано'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="about"
          onclick="editProfileField('about')"
        >

          <span class="profile-detail-icon">
            📝
          </span>

          <span class="profile-detail-content">

            <strong>
              Про себе
            </strong>

            <small>
              ${escapeHtml(
                profileData.about ||
                'Не заповнено'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="email"
          onclick="editProfileField('email')"
        >

          <span class="profile-detail-icon">
            ✉️
          </span>

          <span class="profile-detail-content">

            <strong>
              Email
            </strong>

            <small>
              ${escapeHtml(email)}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>

      </div>

    </div>

  `;
}
// =========================================================
// AVATAR
// =========================================================

async function changeProfileAvatar() {

  const input = document.createElement('input');

  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async function(event) {

    const file = event.target.files[0];

    if (!file) return;

    await handleAvatarUpload(file);
  };

  input.click();
}


async function handleAvatarUpload(file) {

  if (!supabaseClient) {
    alert('Supabase не підключено.');
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    alert('Потрібно увійти в акаунт.');
    return;
  }

  const user =
    sessionData.session.user;

  const fileExt =
    file.name.split('.').pop().toLowerCase();

  const filePath =
    `${user.id}/avatar.${fileExt}`;

  const {
    error: uploadError
  } =
    await supabaseClient
      .storage
      .from('avatars')
      .upload(
        filePath,
        file,
        {
          upsert: true,
          contentType: file.type
        }
      );

  if (uploadError) {

    console.error(
      'Помилка завантаження аватара:',
      uploadError
    );

    alert(
      'Не вдалося завантажити фото: ' +
      uploadError.message
    );

    return;
  }

  const {
    data: publicUrlData
  } =
    supabaseClient
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

  const avatarUrl =
    publicUrlData.publicUrl;

  const {
    error: updateError
  } =
    await supabaseClient
      .from('profiles')
      .update({
        avatar_url: avatarUrl
      })
      .eq('id', user.id);

  if (updateError) {

    console.error(
      'Помилка збереження avatar_url:',
      updateError
    );

    alert(
      'Фото завантажено, але не вдалося зберегти його в профілі.'
    );

    return;
  }

  await renderProfile();
}// =========================================================
// EDIT PROFILE
// =========================================================

function editProfile() {

  const profile =
    getProfile();


  const nickname =
    prompt(
      'Нікнейм:',
      profile.nickname
    );


  if (nickname === null) {
    return;
  }


  const bike =
    prompt(
      'Мотоцикл:',
      profile.bike
    );


  if (bike === null) {
    return;
  }


  const city =
    prompt(
      'Місто:',
      profile.city
    );


  if (city === null) {
    return;
  }


  const about =
    prompt(
      'Про себе:',
      profile.about
    );


  if (about === null) {
    return;
  }


  profile.nickname =
    nickname.trim() ||
    'Moto Rider';

  profile.bike =
    bike.trim() ||
    'Поки не вказано';

  profile.city =
    city.trim() ||
    'Поки не вказано';

  profile.about =
    about.trim() ||
    'Не заповнено';


  saveProfile(
    profile
  );


  renderProfile();

}


// =========================================================
// SETTINGS
// =========================================================

function showSettings() {

  currentScreen =
    'settings';


  hideAllScreens();

  hideMapInterface();

  hideCloseButton();


  const settings =
    document.getElementById(
      'settings'
    );


  if (!settings) return;


  settings.style.display =
    'block';


  const theme = getSavedTheme();
  const themeMode = getThemeMode();


  settings.innerHTML = `

    <div class="screen-card">

      <div class="screen-title-row">

        <div>

          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h2>
            ⚙️ Налаштування
          </h2>

        </div>

      </div>


      <div class="settings-row">

        <div class="settings-info">

          <strong>
            Тема
          </strong>

          <span id="themeLabel">
            ${themeMode === 'auto'
              ? `Автоматично (${theme === 'dark' ? 'темна' : 'світла'})`
              : theme === 'light' ? 'Світла' : 'Темна'}
          </span>

        </div>


        <select
          class="theme-mode-select"
          aria-label="Режим теми"
          onchange="setThemeMode(this.value)"
        >
          <option value="auto" ${themeMode === 'auto' ? 'selected' : ''}>Автоматично</option>
          <option value="light" ${themeMode === 'light' ? 'selected' : ''}>Світла</option>
          <option value="dark" ${themeMode === 'dark' ? 'selected' : ''}>Темна</option>
        </select>

      </div>


      <button
        class="secondary-btn"
        type="button"
        onclick="showProfile()"
      >
        ← Профіль
      </button>

    </div>

  `;

}


// =========================================================
// AUTH
// =========================================================

let authMode =
  'login';


function openAuthModal() {

  const modal =
    document.getElementById(
      'authModal'
    );


  if (modal) {

    modal.style.display =
      'flex';

  }


  showLoginForm();

}


function closeAuthModal() {

  const modal =
    document.getElementById(
      'authModal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


function showLoginForm() {

  authMode =
    'login';


  document
    .getElementById(
      'authLoginTab'
    )
    .classList.add('active');


  document
    .getElementById(
      'authRegisterTab'
    )
    .classList.remove('active');


  document
    .getElementById(
      'authPhoneGroup'
    )
    .style.display =
    'none';


  document
    .getElementById(
      'authPasswordConfirmGroup'
    )
    .style.display =
    'none';


  document
    .getElementById(
      'authSubmitButton'
    )
    .textContent =
    'Увійти';


  document
    .getElementById(
      'authModalTitle'
    )
    .textContent =
    'Вхід у Moto Maps';


  document
    .getElementById(
      'authModalDescription'
    )
    .textContent =
    'Увійди до свого облікового запису.';


  clearAuthMessage();

}


function showRegisterForm() {

  authMode =
    'register';


  document
    .getElementById(
      'authRegisterTab'
    )
    .classList.add('active');


  document
    .getElementById(
      'authLoginTab'
    )
    .classList.remove('active');


  document
    .getElementById(
      'authPhoneGroup'
    )
    .style.display =
    'block';


  document
    .getElementById(
      'authPasswordConfirmGroup'
    )
    .style.display =
    'block';


  document
    .getElementById(
      'authSubmitButton'
    )
    .textContent =
    'Створити акаунт';


  document
    .getElementById(
      'authModalTitle'
    )
    .textContent =
    'Реєстрація';


  document
    .getElementById(
      'authModalDescription'
    )
    .textContent =
    'Створи свій акаунт Moto Maps.';


  clearAuthMessage();

}


function setAuthMessage(
  message,
  type = 'error'
) {

  const element =
    document.getElementById(
      'authMessage'
    );


  if (!element) return;


  element.textContent =
    message;


  element.style.color =
    type === 'success'
      ? 'var(--turquoise)'
      : 'var(--danger)';

}


function clearAuthMessage() {

  const element =
    document.getElementById(
      'authMessage'
    );


  if (element) {

    element.textContent =
      '';

  }

}


// =========================================================
// PHONE FORMAT
// =========================================================

function formatUkrainePhone(
  value
) {

  let digits =
    String(value)
      .replace(/\D/g, '');


  if (digits.startsWith('380')) {

    digits =
      digits.substring(3);

  }


  if (digits.startsWith('38')) {

    digits =
      digits.substring(2);

  }


  digits =
    digits.substring(0, 10);


  let result =
    '+38';


  if (digits.length > 0) {

    result +=
      ' ' +
      digits.substring(0, 3);

  }


  if (digits.length > 3) {

    result +=
      ' ' +
      digits.substring(3, 6);

  }


  if (digits.length > 6) {

    result +=
      ' ' +
      digits.substring(6, 8);

  }


  if (digits.length > 8) {

    result +=
      ' ' +
      digits.substring(8, 10);

  }


  return result;

}


function formatUkrainePhoneInput(
  input
) {

  input.value =
    formatUkrainePhone(
      input.value
    );

}


// =========================================================
// LOGIN / REGISTER
// =========================================================

async function loginUser() {

  if (!supabaseClient) {

    setAuthMessage(
      'Supabase недоступний.'
    );

    return;

  }


  const email =
    document.getElementById(
      'authEmail'
    ).value.trim();


  const password =
    document.getElementById(
      'authPassword'
    ).value;


  if (!email) {

    setAuthMessage(
      'Введіть email.'
    );

    return;

  }


  if (!password) {

    setAuthMessage(
      'Введіть пароль.'
    );

    return;

  }


  try {

    if (authMode === 'login') {

      const result =
        await supabaseClient.auth.signInWithPassword({

          email,

          password

        });


      if (result.error) {

        throw result.error;

      }


      setAuthMessage(
        'Вхід виконано.',
        'success'
      );

      setTimeout(
        function() {

          closeAuthModal();

          showMap();

        },
        400
      );


      return;

    }


    const phone =
      document.getElementById(
        'authPhone'
      ).value.trim();


    const confirmPassword =
      document.getElementById(
        'authPasswordConfirm'
      ).value;


    if (password.length < 6) {

      setAuthMessage(
        'Пароль має містити щонайменше 6 символів.'
      );

      return;

    }


    if (password !== confirmPassword) {

      setAuthMessage(
        'Паролі не збігаються.'
      );

      return;

    }


    const result =
      await supabaseClient.auth.signUp({

        email,

        password,

        options: {

          data: {

            phone

          }

        }

      });


    if (result.error) {

      throw result.error;

    }


    setAuthMessage(
      'Акаунт створено. Перевірте email.',
      'success'
    );


  } catch (error) {

    console.error(
      error
    );


    setAuthMessage(
      error.message ||
      'Помилка авторизації.'
    );

  }

}


async function loginWithGoogle() {

  if (!supabaseClient) {

    setAuthMessage(
      'Supabase недоступний.'
    );

    return;

  }


  const androidAppBridge =
    window.MotoMapsAndroid &&
    typeof window.MotoMapsAndroid.openOAuth === 'function';

  if (!androidAppBridge && !/^https?:$/.test(window.location.protocol)) {
    setAuthMessage('Вхід через Google працює на опублікованому сайті або localhost. Відкрий сайт за http:// чи https://.');
    return;
  }

  const button = document.getElementById('googleAuthButton');
  if (button) {
    button.disabled = true;
    button.textContent = 'Перенаправляємо до Google…';
  }

  try {
    const returnUrl = androidAppBridge
      ? 'motomaps://auth/callback'
      : (function() {
          const url = new URL(window.location.href);
          url.search = '';
          url.hash = '';
          return url.toString();
        })();

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: returnUrl,
        skipBrowserRedirect: Boolean(androidAppBridge)
      }
    });

    if (error) throw error;

    if (androidAppBridge) {
      if (!data || !data.url) {
        throw new Error('Не вдалося відкрити Google авторизацію.');
      }
      window.MotoMapsAndroid.openOAuth(data.url);
      if (button) button.textContent = 'Завершіть вхід у браузері…';
    }

  } catch (error) {

    console.error(
      error
    );


    setAuthMessage(
      error.message ||
      'Не вдалося увійти через Google.'
    );

    if (button) {
      button.disabled = false;
      button.innerHTML = '<span class="google-mark" aria-hidden="true">G</span> Продовжити з Google';
    }

  }

}

window.finishMotoMapsAuth = async function(callbackUrl) {
  try {
    const callback = new URL(callbackUrl);
    const providerError = callback.searchParams.get('error_description');
    const code = callback.searchParams.get('code');

    if (providerError) throw new Error(providerError);
    if (!code) throw new Error('Google не повернув код авторизації.');

    const result = await supabaseClient.auth.exchangeCodeForSession(code);
    if (result.error) throw result.error;
  } catch (error) {
    console.error('Android OAuth:', error);
    setAuthMessage(error.message || 'Не вдалося завершити вхід через Google.');
    const button = document.getElementById('googleAuthButton');
    if (button) {
      button.disabled = false;
      button.innerHTML = '<span class="google-mark" aria-hidden="true">G</span> Продовжити з Google';
    }
  }
};


async function logoutUser() {

  if (supabaseClient) {

    await supabaseClient.auth.signOut();

  }


  showMap();

}


// =========================================================
// WEATHER
// =========================================================

function openWeather() {

  const modal =
    document.getElementById(
      'weatherModal'
    );


  if (!modal) return;


  modal.style.display =
    'flex';


  loadWeather();

}


function closeWeather() {

  const modal =
    document.getElementById(
      'weatherModal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


async function loadWeather() {

  let lat =
    47.8388;

  let lon =
    35.1396;


  if (
    meetingLocation &&
    typeof meetingLocation.lat === 'number'
  ) {

    lat =
      meetingLocation.lat;

    lon =
      meetingLocation.lng;

  }


  try {

    const url =
      'https://api.open-meteo.com/v1/forecast?' +
      new URLSearchParams({

        latitude:
          lat,

        longitude:
          lon,

        current:
          'temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,weather_code',

        daily:
          'weather_code,temperature_2m_max,temperature_2m_min',

        timezone:
          'auto',

        forecast_days:
          '4'

      });


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        'Weather request failed'
      );

    }


    const data =
      await response.json();


    renderWeather(
      data
    );

  } catch (error) {

    console.error(
      'Weather:',
      error
    );

    document.getElementById(
      'weatherCurrentDescription'
    ).textContent =
      'Не вдалося завантажити погоду.';

  }

}


function weatherIcon(
  code
) {

  if (code === 0) return '☀️';

  if (
    code === 1 ||
    code === 2
  ) return '🌤️';

  if (code === 3) return '☁️';

  if (
    code >= 45 &&
    code <= 48
  ) return '🌫️';

  if (
    code >= 51 &&
    code <= 67
  ) return '🌧️';

  if (
    code >= 71 &&
    code <= 77
  ) return '❄️';

  if (
    code >= 80 &&
    code <= 82
  ) return '🌦️';

  if (
    code >= 95
  ) return '⛈️';

  return '🌤️';

}


function weatherDescription(
  code
) {

  if (code === 0)
    return 'Ясно';

  if (code <= 2)
    return 'Малохмарно';

  if (code === 3)
    return 'Хмарно';

  if (code <= 48)
    return 'Туман';

  if (code <= 67)
    return 'Дощ';

  if (code <= 77)
    return 'Сніг';

  if (code <= 82)
    return 'Злива';

  return 'Гроза';

}


function renderWeather(
  data
) {

  const current =
    data.current;


  const temperature =
    Math.round(
      current.temperature_2m
    );


  const code =
    current.weather_code;


  document.getElementById(
    'weatherButtonIcon'
  ).textContent =
    weatherIcon(code);


  document.getElementById(
    'weatherButtonTemperature'
  ).textContent =
    temperature +
    '°C';

  const weatherButtonWind = document.getElementById('weatherButtonWind');
  const weatherButtonHumidity = document.getElementById('weatherButtonHumidity');
  if (weatherButtonWind) {
    weatherButtonWind.textContent =
      'Вітер ' + Math.round(current.wind_speed_10m) + ' м/с';
  }
  if (weatherButtonHumidity) {
    weatherButtonHumidity.textContent =
      Math.round(current.relative_humidity_2m) + '%';
  }


  document.getElementById(
    'weatherCurrentIcon'
  ).textContent =
    weatherIcon(code);


  document.getElementById(
    'weatherCurrentTemperature'
  ).textContent =
    temperature +
    '°C';


  document.getElementById(
    'weatherCurrentDescription'
  ).textContent =
    weatherDescription(code);


  document.getElementById(
    'weatherCurrentWind'
  ).textContent =
    Math.round(
      current.wind_speed_10m
    ) +
    ' м/с';


  document.getElementById(
    'weatherCurrentPressure'
  ).textContent =
    Math.round(
      current.pressure_msl
    ) +
    ' гПа';


  document.getElementById(
    'weatherCurrentHumidity'
  ).textContent =
    current.relative_humidity_2m +
    '%';


  const daily =
    data.daily;


  const forecast =
    document.getElementById(
      'weatherForecast'
    );


  if (!forecast) return;


  forecast.innerHTML =
    '';


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const date =
      new Date(
        daily.time[i]
      );


    const title =
      i === 0
        ? 'Сьогодні'
        : date.toLocaleDateString(
            'uk-UA',
            {
              weekday:
                'short'
            }
          );


    forecast.innerHTML += `

      <div class="weather-forecast-card">

        <div>
          ${title}
        </div>

        <div style="font-size:28px">
          ${weatherIcon(
            daily.weather_code[i]
          )}
        </div>

        <strong>
          ${Math.round(
            daily.temperature_2m_max[i]
          )}°
        </strong>

        <small>
          мін. ${Math.round(
            daily.temperature_2m_min[i]
          )}°
        </small>

      </div>

    `;

  }

}


// =========================================================
// INIT
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  function() {

    applyTheme(
      getSavedTheme(),
      false
    );


    renderRideMarkers();


    showMap();
    updateNotificationsBadge();

    // Закриття модальних вікон
    // по кліку на затемнення.

    const modal = document.getElementById('modal');
    if (modal) modal.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeModal();

          }

        }
      );


    const ridersModal = document.getElementById('ridersModal');
    if (ridersModal) ridersModal.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeRidersModal();

          }

        }
      );


    const weatherModal = document.getElementById('weatherModal');
    if (weatherModal) weatherModal.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeWeather();

          }

        }
      );


    const authModal = document.getElementById('authModal');
    if (authModal) authModal.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeAuthModal();

          }

        }
      );


    // Enter у пошуку адреси.

    const rideAddress = document.getElementById('rideAddress');
    if (rideAddress) rideAddress.addEventListener(
        'keydown',
        function(event) {

          if (
            event.key === 'Enter'
          ) {

            event.preventDefault();

            searchMeetingAddress();

          }

        }
      );


    // Перевірка сесії.

    if (supabaseClient) {

      supabaseClient.auth.onAuthStateChange(
        function(event, session) {

          console.log(
            'Auth:',
            event
          );

          if (
            event === 'SIGNED_IN' &&
            session &&
            session.user.app_metadata &&
            session.user.app_metadata.provider === 'google'
          ) {
            // Відкладено, щоб не запускати Supabase-запити всередині auth callback.
            setTimeout(function() {
              closeAuthModal();
              showMap();
              updateNotificationsBadge();
              showSuccessMessage('Вхід через Google виконано.');
            }, 0);
          }

        }
      );

    }

  }
);
