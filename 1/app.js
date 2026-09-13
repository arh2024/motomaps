// =========================================================
// MOTO MAPS — ОСНОВНА ЛОГІКА
// =========================================================


// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL = 'https://mthbckypfurmebncdukj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gfNOlLBzqvK-Sm9PfOzlWA_bDHq-MME';

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  console.log('Supabase підключено');
} else {
  console.warn('Бібліотеку Supabase не завантажено.');
}


// =========================================================
// КАРТА
// =========================================================

const map = L.map('map').setView(
  [47.8388, 35.1396],
  12
);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
).addTo(map);


// =========================================================
// ГЛОБАЛЬНІ ЗМІННІ
// =========================================================

let myMarker = null;
let meetingMarker = null;
let meetingLocation = null;
let rideMarkers = [];


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

      map.setView([lat, lng], 15);

      if (myMarker) {
        myMarker.setLatLng([lat, lng]);
      } else {
        const myLocationIcon = L.divIcon({
          className: 'my-location-marker',
          html: '<div class="my-location-dot"></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        myMarker = L.marker(
          [lat, lng],
          {
            icon: myLocationIcon
          }
        )
          .addTo(map)
          .bindPopup('🏍️ Ви тут');

        myMarker.openPopup();
      }
    },
    function(error) {
      console.error('Помилка геолокації:', error);

      alert(
        'Не вдалося отримати ваше місцезнаходження. ' +
        'Перевірте дозвіл на геолокацію у браузері.'
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}


// =========================================================
// НАВІГАЦІЯ
// =========================================================

function setActiveNavigation(index) {
  const items = document.querySelectorAll(
    'nav > .nav-item'
  );

  items.forEach(function(item, i) {
    item.classList.toggle(
      'active',
      i === index
    );
  });
}


function hideAllSections() {
  const mapElement = document.getElementById('map');
  const rideList = document.getElementById('rideList');
  const chat = document.getElementById('chat');
  const profile = document.getElementById('profile');

  if (mapElement) {
    mapElement.style.display = 'none';
  }

  if (rideList) {
    rideList.style.display = 'none';
  }

  if (chat) {
    chat.style.display = 'none';
  }

  if (profile) {
    profile.style.display = 'none';
  }

  hideWeatherButton();
}


function showMap() {
  hideAllSections();

  const mapElement = document.getElementById('map');

  if (mapElement) {
    mapElement.style.display = 'block';
  }

  setActiveNavigation(0);
  hideBackButton();
  showWeatherButton();

  setTimeout(function() {
    map.invalidateSize();
  }, 100);
}


function showRides() {
  hideAllSections();

  const mapElement = document.getElementById('map');
  const rideList = document.getElementById('rideList');

  if (mapElement) {
    mapElement.style.display = 'block';
  }

  if (rideList) {
    rideList.style.display = 'block';
  }

  setActiveNavigation(1);
  hideBackButton();
  hideWeatherButton();

  renderRides();
  createAllRideMarkers();

  setTimeout(function() {
    map.invalidateSize();
  }, 100);
}


function showChat() {
  hideAllSections();

  const chat = document.getElementById('chat');

  if (chat) {
    chat.style.display = 'block';
  }

  setActiveNavigation(2);
  showBackButton();
  hideWeatherButton();

  renderChat();
}


async function showProfile() {
  hideAllSections();

  const profile = document.getElementById('profile');

  if (profile) {
    profile.style.display = 'block';
  }

  setActiveNavigation(3);
  showBackButton();
  hideWeatherButton();

  if (!supabaseClient) {
    renderProfile();
    return;
  }

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
  }

  if (!data || !data.session) {
    openAuthModal();
    return;
  }

  renderProfile();
}


function goBack() {
  showMap();
}


function showBackButton() {
  const button = document.getElementById('backButton');

  if (button) {
    button.style.display = 'flex';
  }
}


function hideBackButton() {
  const button = document.getElementById('backButton');

  if (button) {
    button.style.display = 'none';
  }
}


// =========================================================
// МОДАЛЬНЕ ВІКНО МОТОПОЇЗДКИ
// =========================================================

function openModal() {
  const modal = document.getElementById('modal');

  if (!modal) {
    return;
  }

  resetRideForm();

  modal.style.display = 'flex';
}


function closeModal() {
  const modal = document.getElementById('modal');

  if (modal) {
    modal.style.display = 'none';
  }
}


function resetRideForm() {
  const fields = [
    'rideName',
    'rideDate',
    'rideTime',
    'ridePeople'
  ];

  fields.forEach(function(id) {
    const field = document.getElementById(id);

    if (field) {
      field.value = '';
    }
  });

  meetingLocation = null;

  const status = document.getElementById('locationStatus');

  if (status) {
    status.textContent =
      'Точка збору ще не вибрана';
  }

  if (meetingMarker) {
    map.removeLayer(meetingMarker);
    meetingMarker = null;
  }
}


document.addEventListener(
  'click',
  function(event) {
    const modal = document.getElementById('modal');

    if (
      modal &&
      event.target === modal
    ) {
      closeModal();
    }
  }
);


// =========================================================
// ТОЧКА ЗБОРУ
// =========================================================

function chooseLocation() {
  closeModal();

  alert(
    'Натисніть на карті, щоб вибрати точку збору.'
  );

  map.once(
    'click',
    function(event) {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;

      meetingLocation = {
        lat: lat,
        lng: lng
      };

      if (meetingMarker) {
        map.removeLayer(meetingMarker);
      }

      meetingMarker = L.marker(
        [lat, lng]
      )
        .addTo(map)
        .bindPopup('🏁 Точка збору')
        .openPopup();

      const status =
        document.getElementById(
          'locationStatus'
        );

      if (status) {
        status.textContent =
          `Точка збору: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      openModal();
    }
  );
}


// =========================================================
// МОТОПОЇЗДКИ — LOCAL STORAGE
// =========================================================

function getRides() {
  try {
    const data =
      localStorage.getItem('motomaps_rides');

    if (!data) {
      return [];
    }

    const rides = JSON.parse(data);

    return Array.isArray(rides)
      ? rides
      : [];
  } catch (error) {
    console.error(
      'Помилка читання мотопоїздок:',
      error
    );

    return [];
  }
}


function saveRides(rides) {
  localStorage.setItem(
    'motomaps_rides',
    JSON.stringify(rides)
  );
}


function saveRide() {
  const name =
    document.getElementById('rideName')?.value.trim();

  const date =
    document.getElementById('rideDate')?.value;

  const time =
    document.getElementById('rideTime')?.value;

  const people =
    document.getElementById('ridePeople')?.value;

  if (!name) {
    alert('Вкажіть назву мотопоїздки.');
    return;
  }

  if (!date) {
    alert('Вкажіть дату мотопоїздки.');
    return;
  }

  if (!time) {
    alert('Вкажіть час мотопоїздки.');
    return;
  }

  if (!meetingLocation) {
    alert('Виберіть точку збору.');
    return;
  }

  const rides = getRides();

  const ride = {
    id: Date.now(),
    name: name,
    date: date,
    time: time,
    people: people || 'Без обмеження',
    lat: meetingLocation.lat,
    lng: meetingLocation.lng,
    participants: [],
    createdAt: new Date().toISOString()
  };

  rides.push(ride);

  saveRides(rides);

  closeModal();

  alert('Мотопоїздку створено!');

  showRides();
}


function renderRides() {
  const container =
    document.getElementById('rideList');

  if (!container) {
    return;
  }

  const rides = getRides();

  if (!rides.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏍️</div>
        <h3>Мотопоїздок поки немає</h3>
        <p>Створіть першу мотопоїздку та запросіть інших мотоциклістів.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = rides
    .map(function(ride) {
      return `
        <div class="ride-card">
          <div class="ride-card-header">
            <h3>${escapeHtml(ride.name)}</h3>
          </div>

          <div class="ride-card-info">
            <div>📅 ${escapeHtml(ride.date)}</div>
            <div>🕐 ${escapeHtml(ride.time)}</div>
            <div>👥 ${escapeHtml(ride.people)}</div>
          </div>

          <div class="ride-card-actions">
            <button
              class="primary-button"
              type="button"
              onclick="openRideOnMap(${ride.id})"
            >
              ПОКАЗАТИ НА КАРТІ
            </button>

            <button
              class="secondary-button"
              type="button"
              onclick="joinRide(${ride.id})"
            >
              ПРИЄДНАТИСЯ
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}


function createAllRideMarkers() {
  rideMarkers.forEach(function(marker) {
    map.removeLayer(marker);
  });

  rideMarkers = [];

  const rides = getRides();

  rides.forEach(function(ride) {
    if (
      typeof ride.lat !== 'number' ||
      typeof ride.lng !== 'number'
    ) {
      return;
    }

    const icon = L.divIcon({
      className: 'ride-marker',
      html: '<div>🏍️</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker(
      [ride.lat, ride.lng],
      { icon: icon }
    )
      .addTo(map)
      .bindPopup(`
        <strong>${escapeHtml(ride.name)}</strong><br>
        📅 ${escapeHtml(ride.date)}<br>
        🕐 ${escapeHtml(ride.time)}
      `);

    rideMarkers.push(marker);
  });
}


function openRideOnMap(rideId) {
  const rides = getRides();

  const ride = rides.find(function(item) {
    return Number(item.id) === Number(rideId);
  });

  if (!ride) {
    return;
  }

  showMap();

  if (
    typeof ride.lat === 'number' &&
    typeof ride.lng === 'number'
  ) {
    map.setView(
      [ride.lat, ride.lng],
      15
    );

    const marker = L.marker([
      ride.lat,
      ride.lng
    ])
      .addTo(map)
      .bindPopup(`
        <strong>${escapeHtml(ride.name)}</strong><br>
        📅 ${escapeHtml(ride.date)}<br>
        🕐 ${escapeHtml(ride.time)}
      `)
      .openPopup();

    setTimeout(function() {
      map.removeLayer(marker);
    }, 30000);
  }
}


function joinRide(rideId) {
  const rides = getRides();

  const ride = rides.find(function(item) {
    return Number(item.id) === Number(rideId);
  });

  if (!ride) {
    alert('Мотопоїздку не знайдено.');
    return;
  }

  if (!ride.participants) {
    ride.participants = [];
  }

  const profile = getProfile();

  const participant = {
    nickname:
      profile.nickname || 'Мотоцикліст',
    phone:
      profile.phone || ''
  };

  const exists =
    ride.participants.some(function(item) {
      return item.nickname === participant.nickname;
    });

  if (!exists) {
    ride.participants.push(participant);
  }

  saveRides(rides);

  alert(
    'Ви приєдналися до мотопоїздки.'
  );

  renderRides();
}


// =========================================================
// ПРОФІЛЬ
// =========================================================

function getProfile() {
  try {
    const data =
      localStorage.getItem('motomaps_profile');

    if (!data) {
      return {
        nickname: '',
        phone: '',
        city: '',
        about: '',
        bike: ''
      };
    }

    return JSON.parse(data);
  } catch (error) {
    return {
      nickname: '',
      phone: '',
      city: '',
      about: '',
      bike: ''
    };
  }
}


function renderProfile() {
  const container =
    document.getElementById('profile');

  if (!container) {
    return;
  }

  const profile = getProfile();

  const nickname =
    profile.nickname ||
    'Мотоцикліст';

  const phone =
    profile.phone ||
    'Не вказано';

  const city =
    profile.city ||
    'Не вказано';

  const bike =
    profile.bike ||
    'Не вказано';

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">🏍️</div>

      <h2>${escapeHtml(nickname)}</h2>

      <div class="profile-info">
        <div>
          <span>📱 Телефон</span>
          <strong>${escapeHtml(phone)}</strong>
        </div>

        <div>
          <span>📍 Місто</span>
          <strong>${escapeHtml(city)}</strong>
        </div>

        <div>
          <span>🏍️ Мотоцикл</span>
          <strong>${escapeHtml(bike)}</strong>
        </div>
      </div>

      <div class="profile-actions">
        <button
          class="primary-button"
          type="button"
          onclick="editProfile()"
        >
          РЕДАГУВАТИ ПРОФІЛЬ
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="logoutUser()"
        >
          ВИЙТИ
        </button>
      </div>
    </div>
  `;
}


async function editProfile() {

  const profile = getProfile();

  const nickname = prompt(
    'Ваш нік:',
    profile.nickname || ''
  );

  if (nickname === null) {
    return;
  }

  const bike = prompt(
    'Ваш мотоцикл:',
    profile.bike || ''
  );

  if (bike === null) {
    return;
  }

  const city = prompt(
    'Ваше місто:',
    profile.city || ''
  );

  if (city === null) {
    return;
  }

  const about = prompt(
    'Про себе:',
    profile.about || ''
  );

  if (about === null) {
    return;
  }

  const newNickname = nickname.trim();
  const newBike = bike.trim();
  const newCity = city.trim();
  const newAbout = about.trim();

  if (!newNickname) {
    alert('Нік не може бути порожнім.');
    return;
  }

  if (!supabaseClient) {
    alert('З’єднання з базою даних недоступне.');
    return;
  }

  try {

    // Отримуємо поточного користувача.

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      console.error(
        'Помилка отримання сесії:',
        sessionError
      );

      alert(
        'Не вдалося отримати дані користувача.'
      );

      return;
    }

    const session = sessionData.session;

    if (!session || !session.user) {
      alert(
        'Спочатку потрібно увійти до облікового запису.'
      );

      openAuthModal();

      return;
    }

    const userId = session.user.id;


    // Оновлюємо профіль.

    const {
      data: profileData,
      error: profileError
    } = await supabaseClient
      .from('profiles')
      .update({
        nickname: newNickname,
        city: newCity || null,
        about: newAbout || null
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {

      console.error(
        'Помилка оновлення профілю:',
        profileError
      );

      alert(
        'Не вдалося зберегти профіль.'
      );

      return;
    }


    // Перевіряємо, чи є мотоцикл користувача.

    const {
      data: motorcycles,
      error: motorcycleSearchError
    } = await supabaseClient
      .from('motorcycles')
      .select('id, brand, model')
      .eq('user_id', userId)
      .limit(1);

    if (motorcycleSearchError) {

      console.error(
        'Помилка пошуку мотоцикла:',
        motorcycleSearchError
      );

      alert(
        'Профіль збережено, але не вдалося знайти мотоцикл.'
      );

      return;
    }


    // Якщо мотоцикл уже є — оновлюємо його.

    if (
      motorcycles &&
      motorcycles.length > 0
    ) {

      const motorcycleId =
        motorcycles[0].id;

      const {
        error: motorcycleUpdateError
      } = await supabaseClient
        .from('motorcycles')
        .update({
          brand:
            newBike || 'Не вказано',
          model:
            'Не вказано'
        })
        .eq('id', motorcycleId);

      if (motorcycleUpdateError) {

        console.error(
          'Помилка оновлення мотоцикла:',
          motorcycleUpdateError
        );

        alert(
          'Профіль збережено, але мотоцикл не вдалося оновити.'
        );

        return;
      }

    } else {

      // Якщо мотоцикла ще немає — створюємо запис.

      if (newBike) {

        const {
          error: motorcycleInsertError
        } = await supabaseClient
          .from('motorcycles')
          .insert({
            user_id: userId,
            brand: newBike,
            model: 'Не вказано'
          });

        if (motorcycleInsertError) {

          console.error(
            'Помилка додавання мотоцикла:',
            motorcycleInsertError
          );

          alert(
            'Профіль збережено, але мотоцикл не вдалося додати.'
          );

          return;
        }
      }
    }


    // Оновлюємо локальні дані для швидкого відображення.

    localStorage.setItem(
      'motomaps_profile',
      JSON.stringify({

        id: userId,

        nickname:
          profileData.nickname || newNickname,

        phone:
          profileData.phone ||
          profile.phone ||
          '',

        bike:
          newBike ||
          'Не вказано',

        city:
          profileData.city ||
          newCity ||
          'Не вказано',

        about:
          profileData.about ||
          newAbout ||
          'Не заповнено'
      })
    );


    alert(
      'Профіль та мотоцикл успішно оновлено.'
    );

    renderProfile();

  } catch (error) {

    console.error(
      'Несподівана помилка:',
      error
    );

    alert(
      'Сталася помилка під час збереження.'
    );
  }
}

// =========================================================
// АВТОРИЗАЦІЯ
// =========================================================

function openAuthModal() {
  const modal =
    document.getElementById('authModal');

  if (!modal) {
    return;
  }

  showLoginForm();

  modal.style.display = 'flex';
}


function closeAuthModal() {
  const modal =
    document.getElementById('authModal');

  if (modal) {
    modal.style.display = 'none';
  }

  clearAuthMessage();
}


function clearAuthMessage() {
  const message =
    document.getElementById('authMessage');

  if (message) {
    message.textContent = '';
  }
}


function showAuthMessage(text, type) {
  const message =
    document.getElementById('authMessage');

  if (!message) {
    return;
  }

  message.textContent = text;
  message.className =
    'auth-message' +
    (type ? ` ${type}` : '');
}


function showLoginForm() {
  const title =
    document.getElementById('authModalTitle');

  const description =
    document.getElementById(
      'authModalDescription'
    );

  const loginTab =
    document.getElementById('authLoginTab');

  const registerTab =
    document.getElementById(
      'authRegisterTab'
    );

  const phoneGroup =
    document.getElementById(
      'authPhoneGroup'
    );

  const passwordConfirmGroup =
    document.getElementById(
      'authPasswordConfirmGroup'
    );

  const submitButton =
    document.getElementById(
      'authSubmitButton'
    );

  if (title) {
    title.textContent = 'Вхід';
  }

  if (description) {
    description.textContent =
      'Увійдіть до Moto Maps';
  }

  if (loginTab) {
    loginTab.classList.add('active');
  }

  if (registerTab) {
    registerTab.classList.remove('active');
  }

  if (phoneGroup) {
    phoneGroup.style.display = 'none';
  }

  if (passwordConfirmGroup) {
    passwordConfirmGroup.style.display = 'none';
  }

  if (submitButton) {
    submitButton.textContent = 'УВІЙТИ';
    submitButton.onclick = loginUser;
  }

  clearAuthMessage();
}


function showRegisterForm() {
  const title =
    document.getElementById('authModalTitle');

  const description =
    document.getElementById(
      'authModalDescription'
    );

  const loginTab =
    document.getElementById('authLoginTab');

  const registerTab =
    document.getElementById(
      'authRegisterTab'
    );

  const phoneGroup =
    document.getElementById(
      'authPhoneGroup'
    );

  const passwordConfirmGroup =
    document.getElementById(
      'authPasswordConfirmGroup'
    );

  const submitButton =
    document.getElementById(
      'authSubmitButton'
    );

  if (title) {
    title.textContent = 'Реєстрація';
  }

  if (description) {
    description.textContent =
      'Створіть обліковий запис Moto Maps';
  }

  if (loginTab) {
    loginTab.classList.remove('active');
  }

  if (registerTab) {
    registerTab.classList.add('active');
  }

  if (phoneGroup) {
    phoneGroup.style.display = 'block';
  }

  if (passwordConfirmGroup) {
    passwordConfirmGroup.style.display =
      'block';
  }

  if (submitButton) {
    submitButton.textContent =
      'ЗАРЕЄСТРУВАТИСЯ';

    submitButton.onclick =
      registerUser;
  }

  clearAuthMessage();
}


async function loginUser() {
  if (!supabaseClient) {
    showAuthMessage(
      'Supabase недоступний.',
      'error'
    );

    return;
  }

  const email =
    document.getElementById(
      'authEmail'
    )?.value.trim();

  const password =
    document.getElementById(
      'authPassword'
    )?.value;

  if (!email || !password) {
    showAuthMessage(
      'Введіть email та пароль.',
      'error'
    );

    return;
  }

  showAuthMessage(
    'Виконується вхід...'
  );

  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {
    console.error(error);

    showAuthMessage(
      error.message ||
      'Не вдалося виконати вхід.',
      'error'
    );

    return;
  }

  if (data && data.user) {
    await loadUserProfile(data.user);

    showAuthMessage(
      'Вхід виконано успішно.',
      'success'
    );

    setTimeout(function() {
      closeAuthModal();
      showProfile();
    }, 500);
  }
}


async function registerUser() {
  if (!supabaseClient) {
    showAuthMessage(
      'Supabase недоступний.',
      'error'
    );

    return;
  }

  const email =
    document.getElementById(
      'authEmail'
    )?.value.trim();

  const phone =
    document.getElementById(
      'authPhone'
    )?.value.trim();

  const password =
    document.getElementById(
      'authPassword'
    )?.value;

  const passwordConfirm =
    document.getElementById(
      'authPasswordConfirm'
    )?.value;

  if (!email) {
    showAuthMessage(
      'Введіть email.',
      'error'
    );

    return;
  }

  if (!phone) {
    showAuthMessage(
      'Номер телефону є обов’язковим.',
      'error'
    );

    return;
  }

  if (!password) {
    showAuthMessage(
      'Введіть пароль.',
      'error'
    );

    return;
  }

  if (password.length < 6) {
    showAuthMessage(
      'Пароль має містити щонайменше 6 символів.',
      'error'
    );

    return;
  }

  if (password !== passwordConfirm) {
    showAuthMessage(
      'Паролі не збігаються.',
      'error'
    );

    return;
  }

  showAuthMessage(
    'Створюємо обліковий запис...'
  );

  const {
    data,
    error
  } =
    await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

  if (error) {
    console.error(error);

    showAuthMessage(
      error.message ||
      'Не вдалося створити обліковий запис.',
      'error'
    );

    return;
  }

  if (!data || !data.user) {
    showAuthMessage(
      'Користувача не створено.',
      'error'
    );

    return;
  }

  const user = data.user;

  const profile = {
    id: user.id,
    nickname:
      email.split('@')[0],
    phone: phone,
    city: '',
    about: '',
    avatar_url: ''
  };

  const {
    error: profileError
  } =
    await supabaseClient
      .from('profiles')
      .upsert(
        profile,
        {
          onConflict: 'id'
        }
      );

  if (profileError) {
    console.error(
      'Помилка профілю:',
      profileError
    );

    showAuthMessage(
      'Обліковий запис створено, але профіль не збережено.',
      'error'
    );

    return;
  }

  localStorage.setItem(
    'motomaps_profile',
    JSON.stringify({
      nickname: profile.nickname,
      phone: profile.phone,
      city: profile.city,
      about: profile.about,
      bike: ''
    })
  );

  showAuthMessage(
    'Реєстрацію завершено.',
    'success'
  );

  setTimeout(function() {
    closeAuthModal();
    showProfile();
  }, 700);
}


async function loadUserProfile(user) {
  if (!supabaseClient || !user) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

  if (error) {
    console.error(
      'Помилка завантаження профілю:',
      error
    );

    return;
  }

  if (data) {
    localStorage.setItem(
      'motomaps_profile',
      JSON.stringify({
        nickname:
          data.nickname || '',
        phone:
          data.phone || '',
        city:
          data.city || '',
        about:
          data.about || '',
        bike:
          data.bike || ''
      })
    );
  }
}


async function logoutUser() {
  if (supabaseClient) {
    const {
      error
    } =
      await supabaseClient.auth.signOut();

    if (error) {
      console.error(error);
    }
  }

  showMap();
}


async function loginWithGoogle() {
  if (!supabaseClient) {
    showAuthMessage(
      'Supabase недоступний.',
      'error'
    );

    return;
  }

  showAuthMessage(
    'Виконуємо вхід через Google...'
  );

  const {
    error
  } =
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          window.location.origin +
          window.location.pathname
      }
    });

  if (error) {
    console.error(error);

    showAuthMessage(
      error.message ||
      'Не вдалося виконати вхід через Google.',
      'error'
    );
  }
}


// =========================================================
// ЧАТ
// =========================================================

function getChatMessages() {
  try {
    const data =
      localStorage.getItem(
        'motomaps_chat'
      );

    if (!data) {
      return [];
    }

    const messages =
      JSON.parse(data);

    return Array.isArray(messages)
      ? messages
      : [];
  } catch (error) {
    return [];
  }
}


function saveChatMessages(messages) {
  localStorage.setItem(
    'motomaps_chat',
    JSON.stringify(messages)
  );
}


function renderChat() {
  const container =
    document.getElementById('chat');

  if (!container) {
    return;
  }

  const messages =
    getChatMessages();

  container.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <h2>Чати</h2>
      </div>

      <div class="chat-messages">
        ${
          messages.length
            ? messages
                .map(function(message) {
                  return `
                    <div class="chat-message">
                      <strong>
                        ${escapeHtml(
                          message.nickname ||
                          'Мотоцикліст'
                        )}
                      </strong>

                      <p>
                        ${escapeHtml(
                          message.text
                        )}
                      </p>
                    </div>
                  `;
                })
                .join('')
            : `
              <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <h3>Чат поки порожній</h3>
                <p>Напишіть перше повідомлення.</p>
              </div>
            `
        }
      </div>

      <form
        class="chat-form"
        onsubmit="sendMessage(event)"
      >
        <input
          id="chatInput"
          type="text"
          placeholder="Ваше повідомлення..."
          autocomplete="off"
        >

        <button
          type="submit"
        >
          НАДІСЛАТИ
        </button>
      </form>
    </div>
  `;
}


function sendMessage(event) {
  if (event) {
    event.preventDefault();
  }

  const input =
    document.getElementById(
      'chatInput'
    );

  if (!input) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  const profile =
    getProfile();

  const messages =
    getChatMessages();

  messages.push({
    id: Date.now(),
    nickname:
      profile.nickname ||
      'Мотоцикліст',
    text: text,
    createdAt:
      new Date().toISOString()
  });

  saveChatMessages(messages);

  renderChat();
}


// =========================================================
// ПОГОДА
// =========================================================

function showWeatherButton() {
  const button =
    document.getElementById(
      'weatherButton'
    );

  if (button) {
    button.style.display = 'flex';
  }
}


function hideWeatherButton() {
  const button =
    document.getElementById(
      'weatherButton'
    );

  if (button) {
    button.style.display = 'none';
  }
}


function closeWeather() {
  const modal =
    document.getElementById(
      'weatherModal'
    );

  if (modal) {
    modal.style.display = 'none';
  }
}


async function openWeather() {
  const modal =
    document.getElementById(
      'weatherModal'
    );

  if (modal) {
    modal.style.display = 'flex';
  }

  await loadWeather();
}


async function loadWeather() {
  const location =
    await getWeatherLocation();

  if (!location) {
    showWeatherError(
      'Не вдалося визначити місцезнаходження.'
    );

    return;
  }

  const lat =
    location.latitude;

  const lon =
    location.longitude;

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max' +
    '&timezone=auto' +
    '&forecast_days=7';

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        'Помилка сервера погоди.'
      );
    }

    const weather =
      await response.json();

    updateWeatherInterface(
      weather,
      location
    );
  } catch (error) {
    console.error(
      'Помилка погоди:',
      error
    );

    showWeatherError(
      'Не вдалося завантажити погоду.'
    );
  }
}


function getWeatherLocation() {
  return new Promise(function(resolve) {
    if (!navigator.geolocation) {
      resolve({
        latitude: 47.8388,
        longitude: 35.1396
      });

      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(position) {
        resolve({
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude
        });
      },
      function() {
        resolve({
          latitude: 47.8388,
          longitude: 35.1396
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000
      }
    );
  });
}


function getWeatherDescription(code) {
  const descriptions = {
    0: 'Ясно',
    1: 'Переважно ясно',
    2: 'Мінлива хмарність',
    3: 'Похмуро',
    45: 'Туман',
    48: 'Туман',
    51: 'Легкий дощ',
    53: 'Дощ',
    55: 'Сильний дощ',
    61: 'Невеликий дощ',
    63: 'Дощ',
    65: 'Сильний дощ',
    71: 'Невеликий сніг',
    73: 'Сніг',
    75: 'Сильний сніг',
    80: 'Зливи',
    81: 'Зливи',
    82: 'Сильні зливи',
    95: 'Гроза',
    96: 'Гроза з градом',
    99: 'Сильна гроза з градом'
  };

  return (
    descriptions[code] ||
    'Невідомі умови'
  );
}


function getWeatherIcon(code) {
  if (code === 0) {
    return '☀️';
  }

  if (
    code === 1 ||
    code === 2
  ) {
    return '🌤️';
  }

  if (code === 3) {
    return '☁️';
  }

  if (
    code === 45 ||
    code === 48
  ) {
    return '🌫️';
  }

  if (
    code >= 51 &&
    code <= 67
  ) {
    return '🌧️';
  }

  if (
    code >= 71 &&
    code <= 77
  ) {
    return '🌨️';
  }

  if (
    code >= 80 &&
    code <= 82
  ) {
    return '🌦️';
  }

  if (code >= 95) {
    return '⛈️';
  }

  return '🌤️';
}


function updateWeatherInterface(
  weather,
  location
) {
  if (!weather || !weather.current) {
    return;
  }

  const current =
    weather.current;

  const temperature =
    Math.round(
      current.temperature_2m
    );

  const icon =
    getWeatherIcon(
      current.weather_code
    );

  const description =
    getWeatherDescription(
      current.weather_code
    );

  const buttonIcon =
    document.getElementById(
      'weatherButtonIcon'
    );

  const buttonTemperature =
    document.getElementById(
      'weatherButtonTemperature'
    );

  if (buttonIcon) {
    buttonIcon.textContent =
      icon;
  }

  if (buttonTemperature) {
    buttonTemperature.textContent =
      `${temperature}°`;
  }

  const locationElement =
    document.getElementById(
      'weatherModalLocation'
    );

  const currentIcon =
    document.getElementById(
      'weatherCurrentIcon'
    );

  const currentTemperature =
    document.getElementById(
      'weatherCurrentTemperature'
    );

  const currentDescription =
    document.getElementById(
      'weatherCurrentDescription'
    );

  const currentWind =
    document.getElementById(
      'weatherCurrentWind'
    );

  const currentPressure =
    document.getElementById(
      'weatherCurrentPressure'
    );

  const currentHumidity =
    document.getElementById(
      'weatherCurrentHumidity'
    );

  if (locationElement) {
    locationElement.textContent =
      `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
  }

  if (currentIcon) {
    currentIcon.textContent =
      icon;
  }

  if (currentTemperature) {
    currentTemperature.textContent =
      `${temperature}°C`;
  }

  if (currentDescription) {
    currentDescription.textContent =
      description;
  }

  if (currentWind) {
    currentWind.textContent =
      `${Math.round(current.wind_speed_10m)} км/год`;
  }

  if (currentPressure) {
    currentPressure.textContent =
      `${Math.round(current.pressure_msl)} гПа`;
  }

  if (currentHumidity) {
    currentHumidity.textContent =
      `${Math.round(current.relative_humidity_2m)}%`;
  }

  renderTodayWeather(weather);
  renderForecast(weather);
}


function renderTodayWeather(weather) {
  const container =
    document.getElementById(
      'weatherToday'
    );

  if (!container) {
    return;
  }

  const daily =
    weather.daily;

  if (!daily) {
    return;
  }

  container.innerHTML = `
    <div class="weather-day">
      <strong>Сьогодні</strong>

      <span>
        ${getWeatherIcon(
          daily.weather_code[0]
        )}
      </span>

      <div>
        ${Math.round(
          daily.temperature_2m_min[0]
        )}° / 
        ${Math.round(
          daily.temperature_2m_max[0]
        )}°
      </div>
    </div>
  `;
}


function renderForecast(weather) {
  const container =
    document.getElementById(
      'weatherForecast'
    );

  if (!container) {
    return;
  }

  const daily =
    weather.daily;

  if (!daily) {
    return;
  }

  let html = '';

  for (
    let i = 1;
    i < Math.min(
      daily.time.length,
      7
    );
    i++
  ) {
    const date =
      new Date(
        daily.time[i]
      );

    const day =
      date.toLocaleDateString(
        'uk-UA',
        {
          weekday: 'short'
        }
      );

    html += `
      <div class="weather-day">
        <strong>${day}</strong>

        <span>
          ${getWeatherIcon(
            daily.weather_code[i]
          )}
        </span>

        <div>
          ${Math.round(
            daily.temperature_2m_min[i]
          )}° /
          ${Math.round(
            daily.temperature_2m_max[i]
          )}°
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}


function showWeatherError(message) {
  const container =
    document.getElementById(
      'weatherForecast'
    );

  if (container) {
    container.innerHTML = `
      <div class="weather-error">
        ${escapeHtml(message)}
      </div>
    `;
  }
}


// =========================================================
// ПОШУК ПО КАРТІ
// =========================================================

async function searchPlace(query) {
  if (!query) {
    return;
  }

  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=json` +
    `&q=${encodeURIComponent(query)}` +
    `&limit=5` +
    `&accept-language=uk`;

  try {
    const response =
      await fetch(url, {
        headers: {
          Accept:
            'application/json'
        }
      });

    const results =
      await response.json();

    if (!results.length) {
      alert(
        'Місце не знайдено.'
      );

      return;
    }

    const result =
      results[0];

    const lat =
      Number(result.lat);

    const lon =
      Number(result.lon);

    map.setView(
      [lat, lon],
      15
    );

    L.marker([
      lat,
      lon
    ])
      .addTo(map)
      .bindPopup(
        escapeHtml(
          result.display_name
        )
      )
      .openPopup();

  } catch (error) {
    console.error(
      'Помилка пошуку:',
      error
    );

    alert(
      'Помилка пошуку місця.'
    );
  }
}


// =========================================================
// ДОПОМІЖНІ ФУНКЦІЇ
// =========================================================

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function showCommunity() {
  alert(
    'Розділ спільноти буде доступний у наступній версії.'
  );
}


function showRegistration() {
  openAuthModal();
  showRegisterForm();
}


// =========================================================
// ПОШУК
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  function() {
    const searchInput =
      document.getElementById(
        'mapSearch'
      );

    if (searchInput) {
      searchInput.addEventListener(
        'keydown',
        function(event) {
          if (
            event.key === 'Enter'
          ) {
            event.preventDefault();

            searchPlace(
              searchInput.value.trim()
            );
          }
        }
      );
    }
  }
);


// =========================================================
// ЗАКРИТТЯ МОДАЛЬНИХ ВІКОН
// =========================================================

document.addEventListener(
  'click',
  function(event) {
    const authModal =
      document.getElementById(
        'authModal'
      );

    if (
      authModal &&
      event.target === authModal
    ) {
      closeAuthModal();
    }

    const weatherModal =
      document.getElementById(
        'weatherModal'
      );

    if (
      weatherModal &&
      event.target === weatherModal
    ) {
      closeWeather();
    }
  }
);


// =========================================================
// ПЕРЕВІРКА СЕСІЇ SUPABASE
// =========================================================

async function checkAuthSession() {
  if (!supabaseClient) {
    return;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        'Помилка перевірки сесії:',
        error
      );

      return;
    }

    if (
      data &&
      data.session &&
      data.session.user
    ) {
      await loadUserProfile(
        data.session.user
      );
    }
  } catch (error) {
    console.error(
      'Помилка сесії:',
      error
    );
  }
}


// =========================================================
// ЗАПУСК
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  async function() {
    showMap();

    await checkAuthSession();

    const rides =
      getRides();

    if (rides.length) {
      createAllRideMarkers();
    }
  }
);