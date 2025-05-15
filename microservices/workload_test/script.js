import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";

// Custom metrics for deeper analysis
const loginDuration = new Trend("login_duration");
const loginSuccess = new Rate("login_success");
const journeyCompletion = new Rate("journey_completion");
const cartAddSuccess = new Rate("cart_add_success");

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

const BASE_URL = "http://aaw-kubeadm-ingress-alb-2051696032.us-east-1.elb.amazonaws.com"; // Sesuaikan jika endpoint Anda berbeda

export function setup() {
  console.log("== Running Setup: Prefetching product IDs ==");
  let productIds = [];
  try {
    const res = http.get(`${BASE_URL}/api/product?limit=100`);

    if (res.status === 200) {
      const data = res.json();
      if (data && data.products && Array.isArray(data.products)) {
        productIds = data.products.map((product) => product.id);
        console.log(
          `Successfully prefetched ${productIds.length} product IDs.`
        );
      } else {
        console.error(
          "Setup: Product data is not in the expected format. Response body:",
          res.body
        );
      }
    } else {
      console.error(
        `Setup: Failed to fetch products. Status: ${res.status}. Body: ${res.body}`
      );
    }
  } catch (e) {
    console.error(`Setup: Error during product prefetch: ${e}`);
  }

  if (productIds.length === 0) {
    console.warn(
      "Setup: No product IDs prefetched. Using fallback static list."
    );
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
  console.warn(
    "getRandomProductId: Prefetched product IDs not available or empty, using static fallback."
  );
  return "fallback-product-id-if-setup-failed";
}

export const options = {
  scenarios: {
    ramp_to_1300: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 1500,
      stages: [
        { duration: '1m', target: 200 },   // Warmup
        { duration: '2m', target: 500 },   // Moderate load
        { duration: '2m', target: 1000 },   // Heavy load
        { duration: '2m', target: 1500 },  // Sustained peak
        { duration: '2m', target: 400 },   // Recovery
        { duration: '1m', target: 50 },    // Final observation
      ],
    },
  },
  // Enhanced metrics thresholds
  thresholds: {
    // Response Time metrics
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    "http_req_duration{name:GetProductDetail}": ["p(95)<300"],
    "http_req_duration{name:AddToCart}": ["p(95)<400"],
    "http_req_duration{name:ViewCart}": ["p(95)<350"],

    // Error Rate metrics
    http_req_failed: ["rate<0.05"],
    "http_req_failed{name:GetAllProducts}": ["rate<0.01"],
    "http_req_failed{name:AddToCart}": ["rate<0.03"],
    "http_req_failed{name:Checkout}": ["rate<0.03"],

    // Throughput metrics
    http_reqs: ["rate>10"],

    // Connection metrics
    http_req_connecting: ["p(95)<50"],

    // Response size metrics
    http_req_receiving: ["p(95)<600"],

    // Custom journey metrics for business processes
    "group_duration{group:Journey: Browse & See Product Detail}": [
      "p(95)<1500",
    ],
    "group_duration{group:Journey: View Cart & Checkout}": ["p(95)<2000"],

    // Custom metrics
    login_duration: ["p(95)<1000", "p(99)<2000"],
    login_success: ["rate>0.95"],
    cart_add_success: ["rate>0.95"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

function login(userType) {
  let username, password;
  let startTime = Date.now();

  if (userType === "admin") {
    username = "admin"; // Kredensial Admin
    password = "Admin123"; // Kredensial Admin
  } else {
    username = "user1"; // Kredensial User Biasa
    password = "UserUser1"; // Kredensial User Biasa
  }

  const loginPayload = JSON.stringify({
    username: username,
    password: password,
  });
  const loginParams = { headers: { "Content-Type": "application/json" } };
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    loginParams
  );

  // Track login duration
  loginDuration.add(Date.now() - startTime);

  // Track login success rate
  const isSuccess = loginRes.status === 200 || loginRes.status === 201;
  loginSuccess.add(isSuccess ? 1 : 0);

  check(loginRes, {
    [`Login successful (${userType})`]: (r) => isSuccess,
  });

  if (isSuccess) {
    try {
      return loginRes.json("token");
    } catch (e) {
      console.error(
        `Login (${userType}): Failed to parse token from response: ${e}. Response: ${loginRes.body}`
      );
      return null;
    }
  }
  console.error(
    `Login failed for ${userType} (VU ${__VU}). Status: ${loginRes.status}, Body: ${loginRes.body}`
  );
  return null;
}

// --- Journeys ---
function browseAndSeeProductDetailJourney(token, data) {
  let journeySuccess = true;

  group("Journey: Browse & See Product Detail", function () {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let productId = getRandomProductId(data);
    const page = Math.floor(Math.random() * 80) + 1; // Random page number between 1 and 10

    let resList = http.get(`${BASE_URL}/api/product?limit=100&page=${page}`, {
      headers,
      tags: { name: "GetAllProducts" },
    });
    const listSuccess = check(resList, {
      "List products: status 200": (r) => r.status === 200,
    });
    if (!listSuccess) journeySuccess = false;

    sleep(poissonRandomSleep(1));

    if (productId && productId !== "fallback-product-id-if-setup-failed") {
      const detailHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      let resDetail = http.get(`${BASE_URL}/api/product/${productId}`, {
        headers: detailHeaders,
        tags: { name: "GetProductDetail" },
      });
      const detailSuccess = check(resDetail, {
        "Product detail: status 200": (r) => r.status === 200,
      });
      if (!detailSuccess) journeySuccess = false;
    }
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

function addToCartJourney(token, data) {
  let journeySuccess = true;

  group("Journey: Add to Cart", function () {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const productId = getRandomProductId(data);
    if (!productId || productId === "fallback-product-id-if-setup-failed") {
      console.log("Add to Cart: Skipping due to invalid product ID.");
      journeySuccess = false;
      return;
    }
    const payload = JSON.stringify({ product_id: productId, quantity: 1 });

    let res = http.post(`${BASE_URL}/api/cart`, payload, {
      headers,
      tags: { name: "AddToCart" },
    });
    const success = check(res, {
      "Add to cart: status 200/201": (r) =>
        r.status === 200 || r.status === 201,
    });
    if (!success) journeySuccess = false;

    cartAddSuccess.add(success ? 1 : 0);
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

function viewCartAndCheckoutJourney(token, data) {
  let journeySuccess = true;

  group("Journey: View Cart", function () {
    const headers = { Authorization: `Bearer ${token}` };

    // Only perform the cart viewing operation
    let resCart = http.get(`${BASE_URL}/api/cart`, {
      headers,
      tags: { name: "ViewCart" },
    });
    const cartSuccess = check(resCart, {
      "View cart: status 200": (r) => r.status === 200,
    });
    if (!cartSuccess) journeySuccess = false;
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

function addWishlistJourney(token, data) {
  let journeySuccess = true;

  group("Journey: Add Wishlist Collection", function () {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const payload = JSON.stringify({ name: `My K6 Wishlist ${Date.now()}` });

    let res = http.post(`${BASE_URL}/api/wishlist`, payload, {
      headers,
      tags: { name: "AddWishlistCollection" },
    });
    const success = check(res, {
      "Add wishlist collection: status 200/201": (r) =>
        r.status === 200 || r.status === 201,
    });
    if (!success) journeySuccess = false;
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

function viewWishlistJourney(token, data) {
  let journeySuccess = true;

  group("Journey: View Wishlist Collections", function () {
    const headers = { Authorization: `Bearer ${token}` };
    let res = http.get(`${BASE_URL}/api/wishlist`, {
      headers,
      tags: { name: "ViewWishlistCollections" },
    });
    const success = check(res, {
      "View wishlist collections: status 200": (r) => r.status === 200,
    });
    if (!success) journeySuccess = false;
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

function adminAddCategoryJourney(token, data) {
  let journeySuccess = true;

  group("Journey: Admin Add Category", function () {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const categoryPayload = JSON.stringify({
      name: `K6 Test Category ${Date.now()}`,
    });
    let res = http.post(`${BASE_URL}/api/product/category`, categoryPayload, {
      headers,
      tags: { name: "AdminAddCategory" },
    });
    const success = check(res, {
      "Admin add category: status 201": (r) => r.status === 201,
    });
    if (!success) journeySuccess = false;
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

function adminEditProductJourney(token, data) {
  let journeySuccess = true;

  group("Journey: Admin Edit Product", function () {
    const headers = { Authorization: `Bearer ${token}` };
    const productId = getRandomProductId(data);
    if (!productId || productId === "fallback-product-id-if-setup-failed") {
      console.log("Admin Edit Product: Skipping due to invalid product ID.");
      journeySuccess = false;
      return;
    }

    let resGet = http.get(`${BASE_URL}/api/product/${productId}`, {
      headers,
      tags: { name: "AdminGetProductForEdit" },
    });
    const getSuccess = check(resGet, {
      "Admin get product for edit (pre-check): status 200": (r) =>
        r.status === 200,
    });
    if (!getSuccess) {
      console.warn(
        `Admin Edit Product: Could not fetch product ${productId} before editing. Skipping PUT.`
      );
      journeySuccess = false;
      return;
    }

    sleep(poissonRandomSleep(1));

    const editHeaders = { ...headers, "Content-Type": "application/json" };
    const productEditPayload = JSON.stringify({
      name: `K6 Updated Product ${Date.now()}`,
      description: "Product updated via k6 load test",
      price: Math.floor(Math.random() * 1200) + 60,
      quantity_available: Math.floor(Math.random() * 50) + 80,
      category_id: resGet.json().category_id,
    });
    let resPut = http.put(
      `${BASE_URL}/api/product/${productId}`,
      productEditPayload,
      { headers: editHeaders, tags: { name: "AdminEditProduct" } }
    );
    const putSuccess = check(resPut, {
      "Admin edit product: status 200": (r) => r.status === 200,
    });
    if (!putSuccess) journeySuccess = false;
  });

  journeyCompletion.add(journeySuccess ? 1 : 0);
}

const userJourneys = [
  {
    name: "BrowseAndSeeProductDetail",
    action: browseAndSeeProductDetailJourney,
    weight: 10,
    isAdminJourney: false,
  },
  {
    name: "AddToCart",
    action: addToCartJourney,
    weight: 8,
    isAdminJourney: false,
  },
  {
    name: "ViewCartAndCheckout",
    action: viewCartAndCheckoutJourney,
    weight: 8,
    isAdminJourney: false,
  },
  {
    name: "AddWishlistCollection",
    action: addWishlistJourney,
    weight: 3,
    isAdminJourney: false,
  },
  {
    name: "ViewWishlistCollections",
    action: viewWishlistJourney,
    weight: 5,
    isAdminJourney: false,
  },
  {
    name: "AdminAddCategory",
    action: adminAddCategoryJourney,
    weight: 1,
    isAdminJourney: true,
  },
  {
    name: "AdminEditProduct",
    action: adminEditProductJourney,
    weight: 1,
    isAdminJourney: true,
  },
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

const vuTokens = {}; // cache token per VU

export default function (data) {
  if (!vuTokens[__VU]) {
    vuTokens[__VU] = {
      user: undefined,  // intentionally undefined (not null), so we know if it has been attempted
      admin: undefined,
    };
  }

  const selectedJourneyObj = selectJourneyByWeight();
  let currentToken;
  let tokenType;

  let requireLogin = true;

  // Journey yang boleh tanpa login (hanya Browse product)
  if (
    selectedJourneyObj.name === "BrowseAndSeeProductDetail" &&
    !selectedJourneyObj.isAdminJourney
  ) {
    requireLogin = false;
  }

  if (selectedJourneyObj.isAdminJourney) {
    tokenType = "admin";
    // Only try login once per VU
    if (vuTokens[__VU].admin === undefined) {
      const token = login("admin");
      vuTokens[__VU].admin = token !== null ? token : undefined;
    }
    currentToken = vuTokens[__VU].admin;
  } else {
    tokenType = "user";
    if (requireLogin && vuTokens[__VU].user === undefined) {
      const token = login("user");
      vuTokens[__VU].user = token !== null ? token : undefined;
    }
    currentToken = vuTokens[__VU].user;
  }

  if (requireLogin && !currentToken) {
    console.warn(
      `VU ${__VU} SKIP — no valid ${tokenType} token and login failed previously. Journey: ${selectedJourneyObj.name}`
    );
    return;
  }

  // Execute journey
  selectedJourneyObj.action(currentToken, data);
  sleep(poissonRandomSleep(0.5));
}
