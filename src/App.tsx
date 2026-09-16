import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Status = "Saved" | "Applied" | "Interview" | "Offer";
type View = "Dashboard" | "Applications" | "Analytics";
type AuthMode = "login" | "register";

type Application = {
  id: string | number;
  company: string;
  role: string;
  location: string;
  status: Status;
  createdAt?: string;
  updatedAt?: string;
  userId?: string | number | null;
};

type User = {
  id: string | number;
  name: string;
  email: string;
};

type StatCardProps = {
  label: string;
  value: number;
  change: string;
};

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

function StatCard({ label, value, change }: StatCardProps) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <h2>{value}</h2>
      <span>{change}</span>
    </div>
  );
}

function App() {
  const [applications, setApplications] = useState<Application[]>([]);

  const [currentView, setCurrentView] =
    useState<View>("Dashboard");

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("applyflow-token")
  );

  const [user, setUser] = useState<User | null>(null);

  const [authMode, setAuthMode] =
    useState<AuthMode>("login");

  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);

  const [draggedApplicationId, setDraggedApplicationId] =
    useState<string | number | null>(null);

  const [dragOverStatus, setDragOverStatus] =
    useState<Status | null>(null);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");

  const [status, setStatus] =
    useState<Status>("Applied");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<Status | "All">("All");

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [authError, setAuthError] =
    useState<string | null>(null);

  useEffect(() => {
    if (token) {
      restoreSession(token);
    } else {
      setLoading(false);
    }
  }, []);

  async function restoreSession(savedToken: string) {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Session expired");
      }

      const currentUser: User =
        await response.json();

      setUser(currentUser);

      await loadApplications(savedToken);
    } catch (error) {
      console.error(error);

      localStorage.removeItem("applyflow-token");

      setToken(null);
      setUser(null);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications(
    authToken = token
  ) {
    if (!authToken) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `${API_URL}/applications`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not load applications."
        );
      }

      const data: Application[] =
        await response.json();

      setApplications(data);
    } catch (error) {
      console.error(error);

      setError(
        "Could not load your applications."
      );
    }
  }

  async function handleAuthSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError(null);

    try {
      const endpoint =
        authMode === "register"
          ? "/auth/register"
          : "/auth/login";

      const body =
        authMode === "register"
          ? {
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
            }
          : {
              email: authEmail.trim(),
              password: authPassword,
            };

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Authentication failed."
        );
      }

      localStorage.setItem(
        "applyflow-token",
        data.token
      );

      setToken(data.token);
      setUser(data.user);

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");

      await loadApplications(data.token);
    } catch (error) {
      console.error(error);

      setAuthError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("applyflow-token");

    setToken(null);
    setUser(null);
    setApplications([]);
    setCurrentView("Dashboard");
    setError(null);
  }

  const stats = useMemo(() => {
    const total = applications.length;

    const saved = applications.filter(
      (application) =>
        application.status === "Saved"
    ).length;

    const applied = applications.filter(
      (application) =>
        application.status === "Applied"
    ).length;

    const interviews = applications.filter(
      (application) =>
        application.status === "Interview"
    ).length;

    const offers = applications.filter(
      (application) =>
        application.status === "Offer"
    ).length;

    const responses =
      interviews + offers;

    return {
      total,
      saved,
      applied,
      interviews,
      offers,
      responses,

      responseRate:
        total === 0
          ? 0
          : Math.round(
              (responses / total) * 100
            ),

      interviewRate:
        total === 0
          ? 0
          : Math.round(
              (interviews / total) * 100
            ),

      offerRate:
        total === 0
          ? 0
          : Math.round(
              (offers / total) * 100
            ),
    };
  }, [applications]);

  const filteredApplications =
    useMemo(() => {
      return applications.filter(
        (application) => {
          const query =
            search.toLowerCase();

          const matchesSearch =
            application.company
              .toLowerCase()
              .includes(query) ||
            application.role
              .toLowerCase()
              .includes(query) ||
            application.location
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "All" ||
            application.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      applications,
      search,
      statusFilter,
    ]);

  function resetForm() {
    setCompany("");
    setRole("");
    setLocation("");
    setStatus("Applied");
    setEditingApplication(null);
  }

  function openNewApplicationModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(
    application: Application
  ) {
    setEditingApplication(application);

    setCompany(application.company);
    setRole(application.role);
    setLocation(application.location);
    setStatus(application.status);

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!token) return;

    if (
      !company.trim() ||
      !role.trim()
    ) {
      return;
    }

    try {
      setError(null);

      const body = {
        company: company.trim(),
        role: role.trim(),

        location:
          location.trim() ||
          "Location not specified",

        status,
      };

      if (editingApplication) {
        const response = await fetch(
          `${API_URL}/applications/${editingApplication.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to update application."
          );
        }

        const updatedApplication: Application =
          await response.json();

        setApplications(
          (current) =>
            current.map(
              (application) =>
                application.id ===
                editingApplication.id
                  ? updatedApplication
                  : application
            )
        );
      } else {
        const response = await fetch(
          `${API_URL}/applications`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to create application."
          );
        }

        const newApplication: Application =
          await response.json();

        setApplications(
          (current) => [
            ...current,
            newApplication,
          ]
        );
      }

      closeModal();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    }
  }

  async function deleteApplication(
    id: string | number
  ) {
    if (!token) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this application?"
      );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/applications/${id}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Delete failed."
        );
      }

      setApplications(
        (current) =>
          current.filter(
            (application) =>
              application.id !== id
          )
      );
    } catch (error) {
      console.error(error);

      setError(
        "Could not delete application."
      );
    }
  }

  function getApplicationsByStatus(
    columnStatus: Status
  ) {
    return applications.filter(
      (application) =>
        application.status ===
        columnStatus
    );
  }

  function handleDragStart(
    applicationId:
      | string
      | number,
    event: React.DragEvent<HTMLDivElement>
  ) {
    setDraggedApplicationId(
      applicationId
    );

    event.dataTransfer.effectAllowed =
      "move";
  }

  function handleDragEnd() {
    setDraggedApplicationId(null);
    setDragOverStatus(null);
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>,
    columnStatus: Status
  ) {
    event.preventDefault();

    setDragOverStatus(
      columnStatus
    );
  }

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
    newStatus: Status
  ) {
    event.preventDefault();

    if (
      !token ||
      draggedApplicationId === null
    ) {
      return;
    }

    const application =
      applications.find(
        (item) =>
          item.id ===
          draggedApplicationId
      );

    if (!application) return;

    if (
      application.status ===
      newStatus
    ) {
      handleDragEnd();
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/applications/${application.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            company:
              application.company,

            role:
              application.role,

            location:
              application.location,

            status:
              newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Move failed."
        );
      }

      const updated: Application =
        await response.json();

      setApplications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              application.id
                ? updated
                : item
          )
      );
    } catch (error) {
      console.error(error);

      setError(
        "Could not update application status."
      );
    } finally {
      handleDragEnd();
    }
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="auth-screen">
        <div className="auth-background" />

        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-icon">
              A
            </div>

            <span>ApplyFlow</span>
          </div>

          <p className="eyebrow">
            {authMode === "login"
              ? "WELCOME BACK"
              : "CREATE ACCOUNT"}
          </p>

          <h1>
            {authMode === "login"
              ? "Continue your search."
              : "Start tracking smarter."}
          </h1>

          <p className="auth-subtitle">
            Track applications,
            interviews, offers, and
            your entire internship
            pipeline in one place.
          </p>

          {authError && (
            <div className="auth-error">
              {authError}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleAuthSubmit}
          >
            {authMode ===
              "register" && (
              <label>
                Name

                <input
                  type="text"
                  placeholder="Elvis Peca"
                  value={authName}
                  onChange={(
                    event
                  ) =>
                    setAuthName(
                      event.target.value
                    )
                  }
                  required
                />
              </label>
            )}

            <label>
              Email

              <input
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(
                  event
                ) =>
                  setAuthEmail(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={authPassword}
                onChange={(
                  event
                ) =>
                  setAuthPassword(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={
                authLoading
              }
            >
              {authLoading
                ? "Please wait..."
                : authMode ===
                    "login"
                  ? "Sign in →"
                  : "Create account →"}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              onClick={() => {
                setAuthError(null);

                setAuthMode(
                  authMode ===
                    "login"
                    ? "register"
                    : "login"
                );
              }}
            >
              {authMode === "login"
                ? "Create account"
                : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map(
      (part) => part[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            A
          </div>

          <span>ApplyFlow</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${
              currentView ===
              "Dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setCurrentView(
                "Dashboard"
              )
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={`nav-item ${
              currentView ===
              "Applications"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setCurrentView(
                "Applications"
              )
            }
          >
            <span>▤</span>
            Applications
          </button>

          <button
            className={`nav-item ${
              currentView ===
              "Analytics"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setCurrentView(
                "Analytics"
              )
            }
          >
            <span>⌁</span>
            Analytics
          </button>

          <button className="nav-item">
            <span>□</span>
            Calendar
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <span>⚙</span>
            Settings
          </button>

          <button
            className="nav-item logout-button"
            onClick={logout}
          >
            <span>↪</span>
            Log out
          </button>

          <div className="profile">
            <div className="avatar">
              {initials}
            </div>

            <div>
              <strong>
                {user.name}
              </strong>

              <small>
                {user.email}
              </small>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard">
        {error && (
          <div className="api-error">
            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError(null)
              }
            >
              ×
            </button>
          </div>
        )}

        {currentView ===
          "Dashboard" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  DASHBOARD
                </p>

                <h1>
                  Welcome back,{" "}
                  {
                    user.name.split(
                      " "
                    )[0]
                  }
                  .
                </h1>

                <p className="subtitle">
                  Here's what's
                  happening with your
                  internship search.
                </p>
              </div>

              <button
                className="add-button"
                onClick={
                  openNewApplicationModal
                }
              >
                <span>+</span>
                New application
              </button>
            </header>

            <section className="stats">
              <StatCard
                label="TOTAL APPLICATIONS"
                value={
                  stats.total
                }
                change={`${stats.total} tracked`}
              />

              <StatCard
                label="RESPONSES"
                value={
                  stats.responses
                }
                change={`${stats.responseRate}% response rate`}
              />

              <StatCard
                label="INTERVIEWS"
                value={
                  stats.interviews
                }
                change={`${stats.interviews} active`}
              />

              <StatCard
                label="OFFERS"
                value={
                  stats.offers
                }
                change={
                  stats.offers > 0
                    ? "Nice work 🎉"
                    : "Keep going"
                }
              />
            </section>

            <section className="pipeline-section">
              <div className="section-title">
                <div>
                  <p className="eyebrow">
                    PIPELINE
                  </p>

                  <h2>
                    Your applications
                  </h2>
                </div>

                <button
                  className="view-all"
                  onClick={() =>
                    setCurrentView(
                      "Applications"
                    )
                  }
                >
                  View all →
                </button>
              </div>

              <div className="pipeline">
                {(
                  [
                    "Saved",
                    "Applied",
                    "Interview",
                    "Offer",
                  ] as Status[]
                ).map(
                  (
                    columnStatus
                  ) => {
                    const columnApplications =
                      getApplicationsByStatus(
                        columnStatus
                      );

                    return (
                      <div
                        className={`pipeline-column ${
                          dragOverStatus ===
                          columnStatus
                            ? "drag-over"
                            : ""
                        }`}
                        key={
                          columnStatus
                        }
                        onDragOver={(
                          event
                        ) =>
                          handleDragOver(
                            event,
                            columnStatus
                          )
                        }
                        onDrop={(
                          event
                        ) =>
                          handleDrop(
                            event,
                            columnStatus
                          )
                        }
                      >
                        <div className="column-title">
                          <span
                            className={`dot ${columnStatus.toLowerCase()}`}
                          />

                          {
                            columnStatus
                          }

                          <strong>
                            {
                              columnApplications.length
                            }
                          </strong>
                        </div>

                        <div className="card-list">
                          {columnApplications.map(
                            (
                              application
                            ) => (
                              <div
                                className={`application-card ${
                                  draggedApplicationId ===
                                  application.id
                                    ? "dragging"
                                    : ""
                                }`}
                                key={
                                  application.id
                                }
                                draggable
                                onDragStart={(
                                  event
                                ) =>
                                  handleDragStart(
                                    application.id,
                                    event
                                  )
                                }
                                onDragEnd={
                                  handleDragEnd
                                }
                              >
                                <div className="company-logo">
                                  {application.company
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div className="application-info">
                                  <h3>
                                    {
                                      application.role
                                    }
                                  </h3>

                                  <p>
                                    {
                                      application.company
                                    }
                                  </p>

                                  <span>
                                    {
                                      application.location
                                    }
                                  </span>

                                  <div className="card-actions">
                                    <button
                                      className="edit-button"
                                      onClick={() =>
                                        openEditModal(
                                          application
                                        )
                                      }
                                    >
                                      Edit
                                    </button>

                                    <button
                                      className="delete-button"
                                      onClick={() =>
                                        deleteApplication(
                                          application.id
                                        )
                                      }
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          </>
        )}

        {currentView ===
          "Applications" && (
          <section className="applications-view">
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  APPLICATIONS
                </p>

                <h1>
                  Your job
                  applications.
                </h1>

                <p className="subtitle">
                  Search, filter,
                  edit, and manage
                  everything in one
                  place.
                </p>
              </div>

              <button
                className="add-button"
                onClick={
                  openNewApplicationModal
                }
              >
                <span>+</span>
                New application
              </button>
            </header>

            <div className="application-toolbar">
              <div className="search-box">
                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search company, role, or location..."
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />
              </div>

              <select
                className="status-filter"
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target
                      .value as
                      | Status
                      | "All"
                  )
                }
              >
                <option value="All">
                  All statuses
                </option>

                <option value="Saved">
                  Saved
                </option>

                <option value="Applied">
                  Applied
                </option>

                <option value="Interview">
                  Interview
                </option>

                <option value="Offer">
                  Offer
                </option>
              </select>
            </div>

            <div className="applications-summary">
              Showing{" "}
              <strong>
                {
                  filteredApplications.length
                }
              </strong>{" "}
              of{" "}
              <strong>
                {
                  applications.length
                }
              </strong>{" "}
              applications
            </div>

            <div className="application-table">
              <div className="table-header">
                <span>
                  COMPANY
                </span>

                <span>
                  ROLE
                </span>

                <span>
                  LOCATION
                </span>

                <span>
                  STATUS
                </span>

                <span>
                  ACTIONS
                </span>
              </div>

              {filteredApplications.length >
              0 ? (
                filteredApplications.map(
                  (
                    application
                  ) => (
                    <div
                      className="table-row"
                      key={
                        application.id
                      }
                    >
                      <div className="table-company">
                        <div className="company-logo">
                          {application.company
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </div>

                        <strong>
                          {
                            application.company
                          }
                        </strong>
                      </div>

                      <span>
                        {
                          application.role
                        }
                      </span>

                      <span>
                        {
                          application.location
                        }
                      </span>

                      <div>
                        <span
                          className={`status-badge ${application.status.toLowerCase()}`}
                        >
                          {
                            application.status
                          }
                        </span>
                      </div>

                      <div className="table-actions">
                        <button
                          onClick={() =>
                            openEditModal(
                              application
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          onClick={() =>
                            deleteApplication(
                              application.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="empty-state">
                  <h3>
                    No applications
                    found.
                  </h3>

                  <p>
                    Try changing your
                    search or filter.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {currentView ===
          "Analytics" && (
          <section className="analytics-view">
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  ANALYTICS
                </p>

                <h1>
                  Your search,
                  visualized.
                </h1>

                <p className="subtitle">
                  Track progress and
                  understand how your
                  internship search is
                  performing.
                </p>
              </div>
            </header>

            <section className="analytics-metrics">
              <div className="analytics-card">
                <p>
                  RESPONSE RATE
                </p>

                <h2>
                  {
                    stats.responseRate
                  }
                  %
                </h2>

                <span>
                  {
                    stats.responses
                  }{" "}
                  responses from{" "}
                  {stats.total}{" "}
                  applications
                </span>
              </div>

              <div className="analytics-card">
                <p>
                  INTERVIEW RATE
                </p>

                <h2>
                  {
                    stats.interviewRate
                  }
                  %
                </h2>

                <span>
                  {
                    stats.interviews
                  }{" "}
                  interviews
                </span>
              </div>

              <div className="analytics-card">
                <p>
                  OFFER RATE
                </p>

                <h2>
                  {
                    stats.offerRate
                  }
                  %
                </h2>

                <span>
                  {
                    stats.offers
                  }{" "}
                  offers
                </span>
              </div>
            </section>

            <div className="analytics-grid">
              <section className="analytics-panel">
                <div className="panel-heading">
                  <p className="eyebrow">
                    STATUS BREAKDOWN
                  </p>

                  <h2>
                    Applications by
                    stage
                  </h2>
                </div>

                <div className="bar-chart">
                  {(
                    [
                      [
                        "Saved",
                        stats.saved,
                      ],
                      [
                        "Applied",
                        stats.applied,
                      ],
                      [
                        "Interview",
                        stats.interviews,
                      ],
                      [
                        "Offer",
                        stats.offers,
                      ],
                    ] as [
                      Status,
                      number
                    ][]
                  ).map(
                    ([
                      label,
                      value,
                    ]) => {
                      const percentage =
                        stats.total ===
                        0
                          ? 0
                          : (value /
                              stats.total) *
                            100;

                      return (
                        <div
                          className="bar-row"
                          key={
                            label
                          }
                        >
                          <div className="bar-label">
                            <span>
                              {
                                label
                              }
                            </span>

                            <strong>
                              {
                                value
                              }
                            </strong>
                          </div>

                          <div className="bar-track">
                            <div
                              className={`bar-fill ${label.toLowerCase()}`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              <section className="analytics-panel">
                <div className="panel-heading">
                  <p className="eyebrow">
                    FUNNEL
                  </p>

                  <h2>
                    Application
                    conversion
                  </h2>
                </div>

                <div className="funnel">
                  <div className="funnel-step">
                    <div>
                      <span>
                        Applications
                      </span>

                      <strong>
                        {
                          stats.total
                        }
                      </strong>
                    </div>

                    <div className="funnel-line full" />
                  </div>

                  <div className="funnel-step">
                    <div>
                      <span>
                        Responses
                      </span>

                      <strong>
                        {
                          stats.responses
                        }
                      </strong>
                    </div>

                    <div
                      className="funnel-line"
                      style={{
                        width: `${
                          stats.total ===
                          0
                            ? 0
                            : (stats.responses /
                                stats.total) *
                              100
                        }%`,
                      }}
                    />
                  </div>

                  <div className="funnel-step">
                    <div>
                      <span>
                        Interviews
                      </span>

                      <strong>
                        {
                          stats.interviews
                        }
                      </strong>
                    </div>

                    <div
                      className="funnel-line"
                      style={{
                        width: `${
                          stats.total ===
                          0
                            ? 0
                            : (stats.interviews /
                                stats.total) *
                              100
                        }%`,
                      }}
                    />
                  </div>

                  <div className="funnel-step">
                    <div>
                      <span>
                        Offers
                      </span>

                      <strong>
                        {
                          stats.offers
                        }
                      </strong>
                    </div>

                    <div
                      className="funnel-line success"
                      style={{
                        width: `${
                          stats.total ===
                          0
                            ? 0
                            : (stats.offers /
                                stats.total) *
                              100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </section>
            </div>
          </section>
        )}
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingApplication
                    ? "EDIT APPLICATION"
                    : "NEW APPLICATION"}
                </p>

                <h2>
                  {editingApplication
                    ? "Edit application"
                    : "Add application"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={
                  closeModal
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <label>
                Company

                <input
                  type="text"
                  placeholder="e.g. Google"
                  value={
                    company
                  }
                  onChange={(
                    event
                  ) =>
                    setCompany(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Role

                <input
                  type="text"
                  placeholder="e.g. Software Engineering Intern"
                  value={
                    role
                  }
                  onChange={(
                    event
                  ) =>
                    setRole(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Location

                <input
                  type="text"
                  placeholder="e.g. New York, NY"
                  value={
                    location
                  }
                  onChange={(
                    event
                  ) =>
                    setLocation(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Status

                <select
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value as Status
                    )
                  }
                >
                  <option value="Saved">
                    Saved
                  </option>

                  <option value="Applied">
                    Applied
                  </option>

                  <option value="Interview">
                    Interview
                  </option>

                  <option value="Offer">
                    Offer
                  </option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  {editingApplication
                    ? "Save changes"
                    : "Add application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;