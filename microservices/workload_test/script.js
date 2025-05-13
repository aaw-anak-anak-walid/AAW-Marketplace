import http from "k6/http";
import { check, sleep, group } from "k6";

function poissonRandomSleep(lambda) {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

const BASE_URL = "http://localhost"; // Sesuaikan jika endpoint Anda berbeda

export function setup() {
  console.log("== Running Setup: Prefetching product IDs ==");
  let productIds = [];
  try {
    const res = http.get(`${BASE_URL}/api/product?limit=100`);

    if (res.status === 200) {
      const data = res.json();
      if (data && data.products && Array.isArray(data.products)) {
        productIds = data.products.map(product => product.id);
        console.log(`Successfully prefetched ${productIds.length} product IDs.`);
      } else {
        console.error("Setup: Product data is not in the expected format. Response body:", res.body);
      }
    } else {
      console.error(`Setup: Failed to fetch products. Status: ${res.status}. Body: ${res.body}`);
    }
  } catch (e) {
    console.error(`Setup: Error during product prefetch: ${e}`);
  }

  if (productIds.length === 0) {
    console.warn("Setup: No product IDs prefetched. Using fallback static list.");
    productIds = [
      "48fbabc4-dee7-4136-bee7-c44544f7858e", // Fallback ID
      "b6e16d5c-995b-461c-bc4f-e3cdaa128d63", // Fallback ID
    ];
  }
  return { productIds: productIds };
}

function getRandomProductId(data) {
  if (data && data.productIds && data.productIds.length > 0) {
    return data.productIds[Math.floor(Math.random() * data.productIds.length)];
  }
  console.warn("getRandomProductId: Prefetched product IDs not available or empty, using static fallback.");
  return "fallback-product-id-if-setup-failed";
}

export const options = {
  scenarios: {
    dynamic_load_pattern: {
      executor: "ramping-arrival-rate",
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 300,
      startRate: 0,
      stages: [
        { duration: "60s", target: 20 },
        { duration: "60s", target: 20 },
        { duration: "120s", target: 100 },
        { duration: "180s", target: 100 },
        { duration: "120s", target: 20 },
        { duration: "60s", target: 20 },
      ],
    },
  },
  thresholds: {
    "http_req_duration": ["p(95)<500"],
    "http_req_failed": ["rate<0.05"],
  },
};

const vuTokens = {};

function login(userType) {
  let username, password;
  if (userType === "admin") {
    username = "admin"; // Kredensial Admin
    password = "Admin123"; // Kredensial Admin
  } else {
    username = "user1";   // Kredensial User Biasa
    password = "UserUser1";   // Kredensial User Biasa
  }

  const loginPayload = JSON.stringify({ username: username, password: password });
  const loginParams = { headers: { "Content-Type": "application/json" } };
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);

  check(loginRes, {
    [`Login successful (${userType})`]: (r) => r.status === 200 || r.status === 201,
  });

  if (loginRes.status === 200 || loginRes.status === 201) {
    try {
      return loginRes.json("token");
    } catch (e) {
      console.error(`Login (${userType}): Failed to parse token from response: ${e}. Response: ${loginRes.body}`);
      return null;
    }
  }
  console.error(`Login failed for ${userType} (VU ${__VU}). Status: ${loginRes.status}, Body: ${loginRes.body}`);
  return null;
}

// --- Journeys ---
function browseAndSeeProductDetailJourney(token, data) {
  group("Journey: Browse & See Product Detail", function () {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let productId = getRandomProductId(data);

    let resList = http.get(`${BASE_URL}/api/product?limit=100`, { headers, tags: { name: "GetAllProducts" } });
    check(resList, { "List products: status 200": (r) => r.status === 200 });

    sleep(poissonRandomSleep(1));

    if (productId && productId !== "fallback-product-id-if-setup-failed") {
      const detailHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      let resDetail = http.get(`${BASE_URL}/api/product/${productId}`, { headers: detailHeaders, tags: { name: "GetProductDetail" } });
      check(resDetail, { "Product detail: status 200": (r) => r.status === 200 });
    }
  });
}

function addToCartJourney(token, data) {
  group("Journey: Add to Cart", function () {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const productId = getRandomProductId(data);
    if (!productId || productId === "fallback-product-id-if-setup-failed") {
      console.log("Add to Cart: Skipping due to invalid product ID.");
      return;
    }
    const payload = JSON.stringify({ product_id: productId, quantity: 1 });

    let res = http.post(`${BASE_URL}/api/cart`, payload, { headers, tags: { name: "AddToCart" } });
    check(res, { "Add to cart: status 200/201": (r) => r.status === 200 || r.status === 201 });
  });
}

function viewCartAndCheckoutJourney(token, data) {
  group("Journey: View Cart & Checkout", function () {
    const headers = { Authorization: `Bearer ${token}` };

    let resCart = http.get(`${BASE_URL}/api/cart`, { headers, tags: { name: "ViewCart" } });
    check(resCart, { "View cart: status 200": (r) => r.status === 200 });

    let cartIsEmpty = true;
    if (resCart.status === 200) {
      try {
        const cartData = resCart.json();
        if (cartData && cartData.cartItems && Array.isArray(cartData.cartItems) && cartData.cartItems.length > 0) {
          cartIsEmpty = false;
        }
      } catch (e) {
        console.warn("ViewCartAndCheckout: Could not parse cart data to check if empty. Assuming empty.");
      }
    }

    if (!cartIsEmpty) {
      sleep(poissonRandomSleep(1));
      const checkoutPayload = JSON.stringify({ shipping_provider: "GOSEND" });
      const postHeaders = { ...headers, "Content-Type": "application/json" };
      let resCheckout = http.post(`${BASE_URL}/api/order`, checkoutPayload, { headers: postHeaders, tags: { name: "Checkout" } });
      check(resCheckout, {
        "Checkout: status 200/201": (r) => r.status === 200 || r.status === 201,
      });
    } else {
      // console.log(`VU ${__VU}: Cart is empty, skipping checkout.`);
    }
  });
}

function addWishlistJourney(token, data) {
  group("Journey: Add Wishlist Collection", function () {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const payload = JSON.stringify({ name: `My K6 Wishlist ${Date.now()}` });

    let res = http.post(`${BASE_URL}/api/wishlist`, payload, { headers, tags: { name: "AddWishlistCollection" } });
    check(res, { "Add wishlist collection: status 200/201": (r) => r.status === 200 || r.status === 201 });
  });
}

function viewWishlistJourney(token, data) {
  group("Journey: View Wishlist Collections", function () {
    const headers = { Authorization: `Bearer ${token}` };
    let res = http.get(`${BASE_URL}/api/wishlist`, { headers, tags: { name: "ViewWishlistCollections" } });
    check(res, { "View wishlist collections: status 200": (r) => r.status === 200 });
  });
}

function adminAddCategoryJourney(token, data) {
  group("Journey: Admin Add Category", function () {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const categoryPayload = JSON.stringify({
      name: `K6 Test Category ${Date.now()}`
    });
    let res = http.post(`${BASE_URL}/api/product/category`, categoryPayload, { headers, tags: { name: "AdminAddCategory" } });
    check(res, { "Admin add category: status 201": (r) => r.status === 201 });
  });
}

function adminEditProductJourney(token, data) {
  group("Journey: Admin Edit Product", function () {
    const headers = { Authorization: `Bearer ${token}` };
    const productId = getRandomProductId(data);
    if (!productId || productId === "fallback-product-id-if-setup-failed") {
      console.log("Admin Edit Product: Skipping due to invalid product ID.");
      return;
    }

    let resGet = http.get(`${BASE_URL}/api/product/${productId}`, { headers, tags: { name: "AdminGetProductForEdit" } });
    check(resGet, { "Admin get product for edit (pre-check): status 200": (r) => r.status === 200 });
    if (resGet.status !== 200) {
      console.warn(`Admin Edit Product: Could not fetch product ${productId} before editing. Skipping PUT.`);
      return;
    }

    sleep(poissonRandomSleep(1));

    const editHeaders = { ...headers, "Content-Type": "application/json" };
    const productEditPayload = JSON.stringify({
      name: `K6 Updated Product ${Date.now()}`,
      description: "Product updated via k6 load test",
      price: Math.floor(Math.random() * 1200) + 60,
      quantity_available: Math.floor(Math.random() * 50) + 80,
      category_id: "some-valid-category-id", // GANTI DENGAN ID KATEGORI VALID YANG ADA
    });
    let resPut = http.put(`${BASE_URL}/api/product/${productId}`, productEditPayload, { headers: editHeaders, tags: { name: "AdminEditProduct" } });
    check(resPut, { "Admin edit product: status 200": (r) => r.status === 200 });
  });
}

const userJourneys = [
  { name: "BrowseAndSeeProductDetail", action: browseAndSeeProductDetailJourney, weight: 10, isAdminJourney: false },
  { name: "AddToCart", action: addToCartJourney, weight: 8, isAdminJourney: false },
  { name: "ViewCartAndCheckout", action: viewCartAndCheckoutJourney, weight: 8, isAdminJourney: false },
  { name: "AddWishlistCollection", action: addWishlistJourney, weight: 3, isAdminJourney: false },
  { name: "ViewWishlistCollections", action: viewWishlistJourney, weight: 5, isAdminJourney: false },
  { name: "AdminAddCategory", action: adminAddCategoryJourney, weight: 1, isAdminJourney: true },
  { name: "AdminEditProduct", action: adminEditProductJourney, weight: 1, isAdminJourney: true },
];

function selectJourneyByWeight() {
  let totalWeight = userJourneys.reduce((sum, j) => sum + j.weight, 0);
  let randomVal = Math.random() * totalWeight;
  for (let i = 0; i < userJourneys.length; i++) {
    if (randomVal < userJourneys[i].weight) {
      return userJourneys[i];
    }
    randomVal -= userJourneys[i].weight;
  }
  return userJourneys[userJourneys.length - 1];
}

export default function (data) {
  if (!vuTokens[__VU]) {
    vuTokens[__VU] = { user: null, admin: null };
  }

  const selectedJourneyObj = selectJourneyByWeight();
  let currentToken;
  let tokenType;

  // Untuk journey "BrowseAndSeeProductDetail", token bersifat opsional jika GET produk tidak butuh auth
  // Namun, untuk journey lain yang pasti butuh token (misal add to cart, admin actions),
  // kita akan tetap login seperti biasa.
  let requireLogin = true;
  if (selectedJourneyObj.name === "BrowseAndSeeProductDetail" && !selectedJourneyObj.isAdminJourney) {
    requireLogin = false;
  }


  if (selectedJourneyObj.isAdminJourney) {
    tokenType = "admin";
    if (!vuTokens[__VU].admin) {
      vuTokens[__VU].admin = login("admin");
    }
    currentToken = vuTokens[__VU].admin;
  } else {
    tokenType = "user";
    if (requireLogin && !vuTokens[__VU].user) {
      vuTokens[__VU].user = login("user");
    }
    currentToken = vuTokens[__VU].user; 
  }


  if (requireLogin && !currentToken) {
    console.error(`VU ${__VU} does not have a ${tokenType} token for journey ${selectedJourneyObj.name}. Skipping.`);
    return;
  }

  selectedJourneyObj.action(currentToken, data);
  sleep(poissonRandomSleep(0.5));
}