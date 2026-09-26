import React, { useEffect, useState } from "react";
import { api, mediaUrl } from "./api";
import { Home, PropertyDetail, PagePreview } from "./OriginalSite";

const tokenKey = "onefracxn.admin.session";
const label = (key) =>
  ({
    featuredIds: "Homepage properties",
    internalNotes: "Internal notes (admin only)",
    published: "Include on published website",
    priceSuffix: "Price label",
    coOwnPrice: "Co-ownership price",
    targetIrr: "Target IRR",
    videoUrl: "Video link",
    mapUrl: "Map link",
    metaTitle: "SEO title",
    metaDescription: "SEO description",
    floorPlan: "Floor plan image",
  })[key] ||
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const newSection = () => ({
  id: crypto.randomUUID(),
  title: "New section",
  body: "",
  image: "",
  visible: true,
  items: [],
});
const templates = {
  sections: newSection,
  items: () => ({ title: "", body: "", image: "" }),
  faqs: () => ({ question: "", answer: "" }),
  pricing: () => ({ label: "", total: "", fraction: "" }),
  amenities: () => "",
  gallery: () => "",
};
const newProperty = () => {
  const id = `property-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    slug: id,
    title: "New property",
    location: "",
    type: "Apartment",
    status: "Coming soon",
    published: false,
    price: "",
    priceSuffix: "/ Fraction",
    totalFractions: 50,
    availableFractions: 50,
    bedrooms: 0,
    bathrooms: 0,
    area: "",
    description: "",
    about: "",
    amenities: [],
    gallery: [],
    cover: "",
    floorPlan: "",
    videoUrl: "",
    mapUrl: "",
    targetIrr: "",
    rentalYield: "",
    possession: "",
    coOwnPrice: "",
    bookingAmount: "",
    pricing: [],
    faqs: [],
    metaTitle: "",
    metaDescription: "",
    internalNotes: "",
  };
};
function ImageField({ value, onChange, token, title }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Maximum image size is 4 MB");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await api("/admin/media", {
        token,
        method: "POST",
        body: { data },
      });
      onChange(result.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="image-field">
      <label>
        {title}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="HTTPS image URL or /assets/img/…"
        />
      </label>
      {value && <img src={mediaUrl(value)} alt="Selected image preview" />}
      <label className="upload-label">
        {busy ? "Uploading…" : "Upload image (JPEG, PNG, WebP · max 4 MB)"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={upload}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function Fields({ value, onChange, token, fieldKey = "" }) {
  if (Array.isArray(value))
    return (
      <div className="array-editor">
        {value.map((item, i) => (
          <div
            className="array-item"
            key={typeof item === "object" && item.id ? item.id : i}
          >
            <div className="array-tools">
              <strong>
                {typeof item === "object"
                  ? item.title || item.question || item.label || `Item ${i + 1}`
                  : `Item ${i + 1}`}
              </strong>
              <button
                type="button"
                className="quiet"
                disabled={!i}
                onClick={() => {
                  const copy = [...value];
                  [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                  onChange(copy);
                }}
                aria-label={`Move item ${i + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="quiet"
                disabled={i === value.length - 1}
                onClick={() => {
                  const copy = [...value];
                  [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                  onChange(copy);
                }}
                aria-label={`Move item ${i + 1} down`}
              >
                ↓
              </button>
              <button
                type="button"
                className="danger quiet"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
            {typeof item === "object" ? (
              <details>
                <summary>
                  Edit{" "}
                  {item.title || item.question || item.label || `item ${i + 1}`}
                </summary>
                <Fields
                  value={item}
                  onChange={(v) =>
                    onChange(value.map((x, j) => (j === i ? v : x)))
                  }
                  token={token}
                />
              </details>
            ) : fieldKey === "gallery" ? (
              <ImageField
                title={`Photo ${i + 1}`}
                value={item}
                onChange={(v) =>
                  onChange(value.map((x, j) => (j === i ? v : x)))
                }
                token={token}
              />
            ) : (
              <input
                aria-label={`Item ${i + 1}`}
                value={item}
                onChange={(e) =>
                  onChange(value.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
            )}
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => onChange([...value, templates[fieldKey]?.() ?? ""])}
        >
          + Add{" "}
          {fieldKey === "faqs"
            ? "question"
            : fieldKey === "gallery"
              ? "photo"
              : "item"}
        </button>
      </div>
    );
  return (
    <div className="field-grid">
      {Object.entries(value)
        .filter(([key]) => key !== "id")
        .map(([key, val]) => {
          const change = (next) => onChange({ ...value, [key]: next });
          if (Array.isArray(val))
            return (
              <fieldset key={key} className="full">
                <legend>{label(key)}</legend>
                <Fields
                  value={val}
                  onChange={change}
                  token={token}
                  fieldKey={key}
                />
              </fieldset>
            );
          if (typeof val === "boolean")
            return (
              <label className="checkbox" key={key}>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => change(e.target.checked)}
                />
                {label(key)}
              </label>
            );
          if (["image", "cover", "floorPlan"].includes(key))
            return (
              <div key={key} className="full">
                <ImageField
                  value={val}
                  onChange={change}
                  token={token}
                  title={label(key)}
                />
              </div>
            );
          if (key === "status")
            return (
              <label key={key}>
                {label(key)}
                <select value={val} onChange={(e) => change(e.target.value)}>
                  <option>Live</option>
                  <option>Coming soon</option>
                  <option>Sold out</option>
                </select>
              </label>
            );
          const multiline = [
            "description",
            "body",
            "about",
            "answer",
            "internalNotes",
            "footerBody",
          ].includes(key);
          return (
            <label key={key} className={multiline ? "full" : ""}>
              {label(key)}
              {multiline ? (
                <textarea
                  rows={4}
                  value={val}
                  onChange={(e) => change(e.target.value)}
                />
              ) : (
                <input
                  type={typeof val === "number" ? "number" : "text"}
                  min={0}
                  value={val}
                  onChange={(e) =>
                    change(
                      typeof val === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
            </label>
          );
        })}
    </div>
  );
}
function Login({ onLogin }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="admin-login">
      <a href="/" className="brand">
        ONE FRACXN
      </a>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { token } = await api("/admin/login", {
              method: "POST",
              body: Object.fromEntries(new FormData(e.currentTarget)),
            });
            sessionStorage.setItem(tokenKey, token);
            onLogin(token);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">YOUR WEBSITE, IN YOUR HANDS</p>
        <h1>Welcome back.</h1>
        <p>Sign in to manage properties, pages and enquiries.</p>
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            defaultValue="admin"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in ↗"}</button>
        <p role="alert">{error}</p>
      </form>
      <a href="/">← Back to website</a>
    </div>
  );
}
export default function Admin() {
  const [token, setToken] = useState(
      () => sessionStorage.getItem(tokenKey) || "",
    ),
    [data, setData] = useState(null),
    [version, setVersion] = useState(0),
    [tab, setTab] = useState("overview"),
    [selected, setSelected] = useState(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [enquiries, setEnquiries] = useState([]),
    [preview, setPreview] = useState(false);
  function signOut() {
    sessionStorage.removeItem(tokenKey);
    setToken("");
    setData(null);
    setDirty(false);
  }
  function failure(e) {
    setError(e.message);
    if (e.status === 401) signOut();
  }
  function edit(next) {
    setData(next);
    setDirty(true);
    setMessage("");
  }
  useEffect(() => {
    document.title = "Admin | OneFracxn";
    if (!token) return;
    api("/admin/content", { token })
      .then((r) => {
        setData(r.draft);
        setVersion(r.version);
      })
      .catch(failure);
    api("/admin/enquiries", { token }).then(setEnquiries).catch(failure);
  }, [token]);
  useEffect(() => {
    const listener = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  async function save(publish) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api("/admin/content", {
        token,
        method: "PUT",
        body: { content: data, version, publish },
      });
      setVersion(r.version);
      setDirty(false);
      setMessage(
        publish
          ? "Published. Your website is now up to date."
          : "Draft saved. The live website is unchanged.",
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  if (!token) return <Login onLogin={setToken} />;
  if (!data)
    return (
      <div className="wrap page">
        <p role="status">{error || "Loading your workspace…"}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        <button onClick={signOut}>Sign out</button>
      </div>
    );
  const property = data.properties.find((p) => p.id === selected);
  const page = data.pages.find((p) => p.slug === selected);
  function navigate(t) {
    setTab(t);
    setSelected(null);
    setPreview(false);
    setError("");
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          ONE FRACXN
        </a>
        <p className="eyebrow">CONTENT STUDIO</p>
        <nav>
          {[
            ["overview", "Overview"],
            ["properties", "Properties"],
            ["showcase", "Homepage showcase"],
            ["home", "Homepage content"],
            ["pages", "Main pages"],
            [
              "enquiries",
              `Enquiries (${enquiries.filter((e) => e.status === "New").length})`,
            ],
            ["settings", "Site settings"],
            ["security", "Password"],
          ].map(([id, title]) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => navigate(id)}
            >
              {title}
            </button>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer">
          Open website ↗
        </a>
        <button
          className="quiet"
          onClick={async () => {
            try {
              await api("/admin/logout", { token, method: "POST" });
              signOut();
            } catch (e) {
              failure(e);
            }
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-toolbar">
          <div>
            <p className="eyebrow">ONE FRACXN / ADMIN</p>
            <span>
              {dirty ? "Unsaved changes" : "Draft workspace"} · Revision{" "}
              {version}
            </span>
          </div>
          <div className="actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => save(false)}
            >
              Save draft
            </button>
            <button disabled={busy} onClick={() => save(true)}>
              {busy ? "Saving…" : "Publish website ↗"}
            </button>
          </div>
        </header>
        <div className="admin-content">
          <p className="notice">
            Save a draft to keep working. Publish website makes all saved editor
            content live. Only properties and pages marked “Include on published
            website” will appear.
          </p>
          {message && (
            <p className="success" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {tab === "overview" && (
            <>
              <h1>Your property workspace.</h1>
              <p>
                Add remarkable places. Tell their story. Decide what comes next.
              </p>
              <div className="dashboard-stats">
                <article>
                  <strong>{data.properties.length}</strong>
                  <span>Properties</span>
                </article>
                <article>
                  <strong>{data.featuredIds.length} / 6</strong>
                  <span>Homepage showcase</span>
                </article>
                <article>
                  <strong>
                    {enquiries.filter((e) => e.status === "New").length}
                  </strong>
                  <span>New enquiries</span>
                </article>
              </div>
              <div className="panel">
                <h2>Make this site your own</h2>
                <ol>
                  <li>
                    Review the imported Skanda property and its internal notes.
                  </li>
                  <li>Add properties, photos, amenities, pricing and FAQs.</li>
                  <li>Choose up to six properties in Homepage showcase.</li>
                  <li>
                    Edit homepage sections, main pages and contact details.
                  </li>
                  <li>Save your draft, preview, then publish your website.</li>
                </ol>
                <button onClick={() => navigate("properties")}>
                  Manage properties ↗
                </button>
              </div>
            </>
          )}
          {tab === "properties" && (
            <>
              <div className="section-heading">
                <h1>{property ? property.title : "Properties"}</h1>
                <button
                  onClick={() => {
                    const p = newProperty();
                    edit({ ...data, properties: [...data.properties, p] });
                    setSelected(p.id);
                  }}
                >
                  + Add property
                </button>
              </div>
              {property ? (
                <>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setSelected(null);
                        setPreview(false);
                      }}
                    >
                      ← All properties
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setPreview(!preview)}
                    >
                      {preview ? "Back to editor" : "Preview property"}
                    </button>
                    <button
                      className="danger secondary"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${property.title} from the draft? Publish to remove it from the website.`,
                          )
                        ) {
                          edit({
                            ...data,
                            properties: data.properties.filter(
                              (p) => p.id !== property.id,
                            ),
                            featuredIds: data.featuredIds.filter(
                              (id) => id !== property.id,
                            ),
                          });
                          setSelected(null);
                        }
                      }}
                    >
                      Delete property
                    </button>
                  </div>
                  {preview ? (
                    <div className="preview">
                      <PropertyDetail data={data} override={property} />
                    </div>
                  ) : (
                    <div className="panel">
                      <Fields
                        value={property}
                        token={token}
                        onChange={(p) =>
                          edit({
                            ...data,
                            properties: data.properties.map((x) =>
                              x.id === p.id ? p : x,
                            ),
                            featuredIds: p.published
                              ? data.featuredIds
                              : data.featuredIds.filter((id) => id !== p.id),
                          })
                        }
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="admin-property-list">
                  {data.properties.map((p) => (
                    <button
                      className="admin-property-row"
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                    >
                      <img src={mediaUrl(p.cover || p.gallery[0])} alt="" />
                      <div>
                        <h3>{p.title}</h3>
                        <p>{p.location || "Add location"}</p>
                        <small>
                          {p.published ? "Included on website" : "Draft only"} ·{" "}
                          {p.status}
                        </small>
                      </div>
                      <span>Edit ↗</span>
                    </button>
                  ))}
                  {!data.properties.length && (
                    <p>No properties yet. Add your first property above.</p>
                  )}
                </div>
              )}
            </>
          )}
          {tab === "showcase" && (
            <>
              <h1>Your homepage collection.</h1>
              <p>
                Select up to six published properties. Use the arrows to set
                their display order.
              </p>
              <div className="panel">
                <h2>{data.featuredIds.length} of 6 selected</h2>
                {data.featuredIds.map((id, i) => {
                  const p = data.properties.find((p) => p.id === id);
                  return (
                    <div className="showcase-row" key={id}>
                      <strong>
                        {i + 1}. {p?.title}
                      </strong>
                      <button
                        className="secondary"
                        disabled={!i}
                        onClick={() => {
                          const ids = [...data.featuredIds];
                          [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                          edit({ ...data, featuredIds: ids });
                        }}
                        aria-label={`Move ${p?.title} up`}
                      >
                        ↑
                      </button>
                      <button
                        className="secondary"
                        disabled={i === data.featuredIds.length - 1}
                        onClick={() => {
                          const ids = [...data.featuredIds];
                          [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                          edit({ ...data, featuredIds: ids });
                        }}
                        aria-label={`Move ${p?.title} down`}
                      >
                        ↓
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          edit({
                            ...data,
                            featuredIds: data.featuredIds.filter(
                              (x) => x !== id,
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <h3>Available properties</h3>
                {data.properties
                  .filter(
                    (p) => p.published && !data.featuredIds.includes(p.id),
                  )
                  .map((p) => (
                    <div className="showcase-row" key={p.id}>
                      <span>
                        {p.title} · {p.location}
                      </span>
                      <button
                        disabled={data.featuredIds.length >= 6}
                        onClick={() =>
                          edit({
                            ...data,
                            featuredIds: [...data.featuredIds, p.id],
                          })
                        }
                      >
                        Add to homepage
                      </button>
                    </div>
                  ))}
                {!data.properties.some(
                  (p) => p.published && !data.featuredIds.includes(p.id),
                ) && (
                  <p>
                    All eligible properties are selected. Add more properties or
                    mark a draft for inclusion on the website.
                  </p>
                )}
              </div>
            </>
          )}
          {tab === "home" && (
            <>
              <div className="section-heading">
                <h1>Homepage content</h1>
                <button
                  className="secondary"
                  onClick={() => setPreview(!preview)}
                >
                  {preview ? "Back to editor" : "Preview homepage"}
                </button>
              </div>
              {preview ? (
                <div className="preview">
                  <Home data={data} />
                </div>
              ) : (
                <div className="panel">
                  <Fields
                    value={data.home}
                    onChange={(home) => edit({ ...data, home })}
                    token={token}
                  />
                </div>
              )}
            </>
          )}
          {tab === "pages" && (
            <>
              <div className="section-heading">
                <h1>Main pages</h1>
                <button
                  onClick={() => {
                    const p = {
                      slug: `page-${crypto.randomUUID().slice(0, 8)}`,
                      title: "New page",
                      description: "",
                      published: false,
                      sections: [],
                    };
                    edit({ ...data, pages: [...data.pages, p] });
                    setSelected(p.slug);
                  }}
                >
                  + Add page
                </button>
              </div>
              <div className="page-tabs">
                {data.pages.map((p) => (
                  <button
                    className={selected === p.slug ? "" : "secondary"}
                    key={p.slug}
                    onClick={() => {
                      setSelected(p.slug);
                      setPreview(false);
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
              {page && (
                <>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => setPreview(!preview)}
                    >
                      {preview ? "Back to editor" : "Preview page"}
                    </button>
                    {!["contact", "why-onefracxn", "how-it-works"].includes(
                      page.slug,
                    ) && (
                      <button
                        className="secondary danger"
                        onClick={() => {
                          if (
                            window.confirm("Remove this page from the draft?")
                          ) {
                            edit({
                              ...data,
                              pages: data.pages.filter(
                                (p) => p.slug !== page.slug,
                              ),
                            });
                            setSelected(null);
                          }
                        }}
                      >
                        Delete page
                      </button>
                    )}
                  </div>
                  {preview ? (
                    <div className="preview">
                      <PagePreview data={data} page={page} />
                    </div>
                  ) : (
                    <div className="panel">
                      <p>
                        Page URL: /{page.slug}. Keep the contact page URL as
                        “contact” to retain the enquiry form.
                      </p>
                      <Fields
                        value={page}
                        token={token}
                        onChange={(next) => {
                          if (
                            [
                              "contact",
                              "why-onefracxn",
                              "how-it-works",
                            ].includes(page.slug)
                          )
                            next.slug = page.slug;
                          edit({
                            ...data,
                            pages: data.pages.map((p) =>
                              p.slug === page.slug ? next : p,
                            ),
                          });
                          setSelected(next.slug);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {tab === "settings" && (
            <>
              <h1>Site settings</h1>
              <p>Your brand, contact information and footer content.</p>
              <div className="panel">
                <Fields
                  value={data.settings}
                  token={token}
                  onChange={(settings) => edit({ ...data, settings })}
                />
              </div>
            </>
          )}
          {tab === "enquiries" && (
            <>
              <div className="section-heading">
                <h1>Enquiries</h1>
                <button
                  className="secondary"
                  onClick={() =>
                    api("/admin/enquiries", { token })
                      .then(setEnquiries)
                      .catch(failure)
                  }
                >
                  Refresh
                </button>
              </div>
              <p>
                Latest 1,000 enquiries. Changes to enquiry status are saved
                immediately.
              </p>
              {enquiries.map((enquiry) => (
                <article className="panel enquiry-card" key={enquiry.id}>
                  <div className="section-heading">
                    <h3>{enquiry.name}</h3>
                    <label>
                      Status
                      <select
                        value={enquiry.status}
                        onChange={async (e) => {
                          const status = e.target.value;
                          try {
                            await api(`/admin/enquiries/${enquiry.id}`, {
                              token,
                              method: "PATCH",
                              body: { status },
                            });
                            setEnquiries(
                              enquiries.map((x) =>
                                x.id === enquiry.id ? { ...x, status } : x,
                              ),
                            );
                          } catch (e) {
                            failure(e);
                          }
                        }}
                      >
                        <option>New</option>
                        <option>Contacted</option>
                        <option>Closed</option>
                      </select>
                    </label>
                  </div>
                  <p>
                    <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a> ·{" "}
                    <a href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`}>
                      {enquiry.phone}
                    </a>
                  </p>
                  <p>{enquiry.message}</p>
                  <small>
                    {data.properties.find((p) => p.id === enquiry.property_id)
                      ?.title ||
                      enquiry.property_id ||
                      "General enquiry"}{" "}
                    · {new Date(enquiry.created_at).toLocaleString()}
                  </small>
                </article>
              ))}
              {!enquiries.length && (
                <div className="panel">
                  <h2>No enquiries yet</h2>
                  <p>Enquiries submitted on the website will appear here.</p>
                </div>
              )}
            </>
          )}
          {tab === "security" && (
            <>
              <h1>Change your password</h1>
              <form
                className="panel password-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  try {
                    await api("/admin/password", {
                      token,
                      method: "POST",
                      body: Object.fromEntries(new FormData(e.currentTarget)),
                    });
                    signOut();
                  } catch (e) {
                    failure(e);
                  }
                }}
              >
                <p>
                  Use at least 12 characters. All sessions will be signed out
                  after changing your password.
                </p>
                <label>
                  Current password
                  <input
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  New password
                  <input
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={200}
                    required
                  />
                </label>
                <button>Update password</button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
