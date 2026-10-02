Overview
OAuth (Open Authorization) is an open standard for token-based authentication and authorization between applications and services. It allows third-party applications to act on a user’s behalf without holding the user’s password, using short-lived access tokens issued by an authorization server.

Access tokens are issued with a defined scope and lifespan, so third-party applications can only perform the actions they have been granted, and only for a bounded period. This model is standard across web, mobile, and desktop clients.

Stalwart includes a built-in OAuth server. It allows clients, such as mail applications or third-party services, to register and obtain the access tokens required to interact with the server’s services.

Clients first register with the built-in OAuth server and receive a unique client id and, optionally, a client secret. Registration can be static (administrator-managed) or dynamic (self-registration over the OAuth Dynamic Client Registration protocol). Once registered, clients request an access token through one of the supported authorization flows and present that token on subsequent requests.

On each request, the OAuth server validates the access token before granting access to a protected resource, so only authorised clients with valid tokens can reach user data.

OAuth 2.0 is enabled by default and requires no configuration to function. Its behaviour can be adjusted through the OidcProvider singleton, which controls token lifetimes, client-registration policy, and related security settings.


Authorization Flows
OAuth 2.0 defines several authorization flows designed to accommodate different types of clients and use cases. Each flow provides a secure mechanism for obtaining an access token that grants permission to access resources on behalf of a user.

Stalwart supports two of the most commonly used flows: the Authorization Code flow (RFC6749) and the Device Authorization flow (RFC8628). These flows cover a wide range of clients, from web-based and mobile applications to smart devices, and let them authenticate and obtain access tokens without exposing user credentials. Between them, these two flows cover both traditional and device-based clients.

Authorization Code Flow
The Authorization Code flow is one of the most secure OAuth 2.0 flows and is commonly used by web applications and services. It is designed for applications that can maintain a confidential client secret, typically server-side applications that interact with a backend service. The flow ensures that user credentials are never exposed directly to the client application, adding an additional layer of security.

The Authorization Code flow involves the following steps:

User Authorization: The client redirects the user to the Stalwart’s authorization endpoint, where the user is prompted to grant or deny access to the application. At this point, the client does not yet have access to the user’s resources.
Authorization Code Issuance: If the user grants access, the Stalwart OAuth server issues a short-lived authorization code and redirects the user back to the client’s redirect URI with this code.
Token Exchange: The client sends the authorization code, along with its client ID and secret, to the Stalwart OAuth server’s token endpoint. If the authorization code is valid, the OAuth server exchanges it for an access token (and optionally a refresh token).
Access to Resources: The client can then use the access token to request the user’s resources from the mail server, while ensuring the user’s credentials remain secure.
This flow is ideal for server-side applications that need to securely handle user credentials and tokens while keeping sensitive information out of the browser or client application.

Device Authorization Flow
The Device Authorization flow, also known as the Device Code flow, is designed for devices that do not have a traditional web browser or have limited input capabilities, such as smart TVs, IoT devices, or game consoles. In these scenarios, users cannot easily enter complex credentials or interact with a standard browser, so the flow is adapted to provide a secure and user-friendly experience.

The Device Authorization flow involves the following steps:

Device Request: The client (e.g., a device or application) makes a request to the Stalwart OAuth server to initiate the Device Authorization flow. The server responds with a device code for the client and a user code for the user, along with a URL where the user can authenticate.
User Authorization: The user is instructed to visit the provided URL on a separate device, such as a smartphone or computer, and enter the user code. This step allows the user to grant or deny access to the client device without directly interacting with the device itself.
Token Polling: While the user authorizes the request, the client device repeatedly polls the Stalwart OAuth server using the device code. Once the user has completed the authorization, the server issues an access token to the device.
Access to Resources: After receiving the access token, the client device can securely access the user’s resources on the mail server without requiring the user to enter credentials directly on the device.
The Device Authorization flow provides a user-friendly and secure method for authenticating devices that are difficult to use for traditional login methods, while still maintaining the security benefits of OAuth 2.0.



Tokens
OAuth tokens are the mechanism by which OAuth 2.0 grants access to protected resources. Instead of sending a username and password on every request, clients present tokens issued by the authorization server; each token has a defined scope and lifespan, which bounds what a compromised token can do.

OAuth defines two primary token types: access tokens and refresh tokens. Each has a distinct role in the authorization process.

Access Tokens
An access token is a short-lived token issued by the authorization server (Stalwart’s built-in OAuth server) after a successful authorization request. The client presents the token to the resource server, which validates it before serving the request.

Access tokens have deliberately short lifetimes (typically minutes to a few hours) to limit the impact of a leak. When the token expires, the client must obtain a new one, either by presenting a refresh token or by repeating the authorization flow.

Access tokens are issued with a scope that determines which resources and actions the token grants. A token issued for message submission, for example, does not authorise reading a user’s inbox or changing their account settings.

Refresh Tokens
Refresh tokens let the client obtain a new access token without involving the user again. When the current access token expires, the client presents its refresh token to the authorization server and receives a new access token.

Refresh tokens live longer than access tokens and are therefore more sensitive, because anyone holding a valid refresh token can mint new access tokens. They should be stored securely by the client and must not be shared. Depending on server policy, each use of a refresh token may either return the same refresh token or a rotated one; Stalwart rotates the refresh token when the remaining lifetime drops below a configured threshold.

Refresh tokens are typically issued alongside access tokens during the initial authorization flow.

Configuration
OAuth token behaviour is configured through the OidcProvider singleton (found in the WebUI under  Settings ›  Authentication › OIDC Provider).

Encryption
Tokens issued by Stalwart are cryptographically signed using a construction inspired by PASETO security tokens:

An encryption key is derived via BLAKE3, combining the principal encryption key configured through encryptionKey with the device id, the expiration time, account details, and an Argon2 hash of the account’s password.
A nonce is derived via BLAKE3 from the user details and the token’s expiration time.
The derived key and nonce are used to seal the token with AES-256-GCM-SIV.
The encryptionKey field accepts a SecretKey variant: a direct value, a reference to an environment variable, or a reference to a file. Reading the key from a file or environment variable avoids committing it to configuration objects.

A 512-bit key is generated during installation. To replace it, generate a new key (for example with LC_ALL=C tr -dc '[:alpha:]' < /dev/urandom | head -c 64 on Linux) and update encryptionKey, for example:

{
  "encryptionKey": {
    "@type": "Value",
    "secret": "sDRvvROsJmRUnjIfcUiDUSaAxdQpfixuLvdwlSffptaxUnSQZALenZSYUPQQByUI"
  }
}

To read the key from an environment variable such as OAUTH_KEY:

{
  "encryptionKey": {
    "@type": "EnvironmentVariable",
    "variableName": "OAUTH_KEY"
  }
}

Be aware that

Changing the encryption key immediately revokes every existing OAuth token.
In clustered deployments, every node must use exactly the same encryption key. Tokens issued on one node are not accepted on another unless the key matches.
The encryption key must be kept private. Reading it from an environment variable or a file prevents it from being stored alongside other configuration.
Expiration
Token and code lifetimes are configured through the following fields on the OidcProvider singleton:

accessTokenExpiry: lifetime of an access token. Default "1h".
refreshTokenExpiry: lifetime of a refresh token. Default "30d".
refreshTokenRenewal: remaining lifetime of a refresh token below which the server issues a new one to the client. Default "4d".
userCodeExpiry: lifetime of a user code issued by the device-authorization flow. Default "30m".
authCodeExpiry: lifetime of an authorization code issued by the authorization-code flow. Default "10m".
idTokenExpiry: lifetime of an OpenID Connect ID token. Default "15m".
The maximum number of failed login attempts against an authorization code is configured through authCodeMaxAttempts; beyond this count the code is invalidated and the user must restart the flow. Default 3.

Revocation
Access and refresh tokens can be revoked by changing the owning account’s password, which invalidates every token previously issued against it. This is available to account owners and to administrators.


Dynamic Registration
The OAuth Dynamic Client Registration Protocol (RFC 7591) extends OAuth 2.0 so that clients can register with an authorization server without administrator intervention. In a pre-registration model, each client id and secret is created manually; dynamic registration is well suited to environments where many applications or devices need to connect, such as cloud services or IoT deployments.

A client that wants to register sends an HTTP request to the OAuth server’s registration endpoint, supplying metadata about itself (name, redirect URIs, and the types of grants it intends to use). If the request is accepted, the server returns a client id and, when applicable, a client secret that the client uses to authenticate during subsequent OAuth flows.

The overall sequence is as follows:

Registration request: the client sends an HTTP POST to the OAuth server’s registration endpoint with its metadata (name, redirect URIs, supported flows, and so on).
Client registration: the server validates the request and, if acceptable, returns a client id and optional secret.
Client use of credentials: the client uses the returned credentials to drive OAuth flows and obtain access and refresh tokens.
Stalwart supports the Dynamic Client Registration Protocol against its built-in OAuth server.

Enabling registration
By default, Stalwart does not require clients to register before requesting access tokens: any client id is accepted. To enforce registration, set requireClientRegistration on the OidcProvider singleton (found in the WebUI under  Settings ›  Authentication › OIDC Provider) to true. When enabled, every client must register and obtain credentials before the server issues tokens to it.

Client authentication
Before a client can register, it must itself authenticate. The recommended approach is to create an API Key for the client. The key should be granted the authenticate and oauth-client-registration permissions, allowing the client to authenticate and to perform the registration call.

Anonymous registrations
Clients can also be allowed to register without any prior authentication, although this is not recommended because it widens the attack surface. Anonymous registration is controlled by anonymousClientRegistration on the OidcProvider singleton. The default, false, should be kept unless there is a specific reason to allow untrusted clients to self-register.

Managing clients
Once dynamic registration is enabled and a client registers successfully, the client is stored as an OAuthClient object (found in the WebUI under  Management ›  Directory › OAuth Clients). The relevant fields are clientId, description, contacts, redirectUris, secret, logo, expiresAt, and memberTenantId. Administrators can modify or delete registered clients from the WebUI or the JMAP API.

WebUI client
The Stalwart WebUI, which includes the Self-Service Portal for end users, authenticates through OAuth. When requireClientRegistration is set to true, the WebUI stops working unless it is itself registered, because its default client id (stalwart-webui) is not registered automatically.

Manual registration
To keep the WebUI functional after enforcing client registration, create an OAuthClient object with:

clientId: stalwart-webui
redirectUris: the OAuth callback for each base path the WebUI is served under, built from the server’s public URL: ["https://<server>/admin/oauth/callback", "https://<server>/account/oauth/callback"]. The /admin path is the administration interface and /account is the Self-Service Portal; adjust these prefixes if server.url-prefix has been customized.
With the WebUI registered as an OAuth client, administrators and users continue to reach the WebUI and the Self-Service Portal without interruption.

Alternative
When administrators prefer not to register the WebUI explicitly, they can instead grant the oauth-client-override permission to administrative accounts. This permission allows the holder to use any client id, bypassing the registration requirement.

The oauth-client-override permission should not be granted to regular accounts. Doing so effectively disables the registration requirement for those accounts and should be reserved for administrators who need to manage the server or troubleshoot access.



Interoperability
OAuth is widely used in web-based applications to provide secure, token-based authentication and authorization. In Stalwart, OAuth can be used to access JMAP as well as the WebUI and self-service portal, which are web-based interfaces that natively support OAuth flows. This usage matches the typical OAuth pattern: users authenticate through a browser, and the application exchanges authorization artefacts for access tokens with the OAuth server.

However, using OAuth in traditional mail clients, such as Outlook, Thunderbird, or Apple Mail, introduces additional complexities. To achieve this, the mail client needs to support the OAUTHBEARER (or XOAUTH2) Simple Authentication and Security Layer (SASL) mechanism, which allows OAuth tokens to be used for authenticating against the mail server.

SASL and OAuth
SASL (Simple Authentication and Security Layer) is a framework that abstracts authentication methods, allowing various protocols (such as IMAP, SMTP, and POP3) to support different authentication mechanisms in a uniform way. When a mail client interacts with a mail server, SASL enables the client to negotiate and use the appropriate authentication method, such as plain text login, GSSAPI (Kerberos), or OAuth-based mechanisms.

With the OAUTHBEARER (or XOAUTH2) SASL mechanism, OAuth tokens can be used for authentication. Instead of sending a password, the client submits an OAuth access token to the mail server as a “bearer token.” The server, in turn, validates the token with the OAuth provider (in this case, the built-in OAuth server of Stalwart) to grant access.

This integration allows OAuth to be used within the traditional mail protocols like IMAP or SMTP, enabling a secure and passwordless authentication method. However, for this to work, the mail client must explicitly support the OAUTHBEARER SASL mechanism.

Limitations
Unfortunately, most mainstream mail clients, including Outlook, Thunderbird, and Apple Mail, do not natively support the OAUTHBEARER / XOAUTH2 SASL mechanisms with third-party OAuth providers like Stalwart. As a result, even though OAuth is a secure and modern authentication method, it cannot be directly used with these clients to authenticate with Stalwart through standard mail protocols like IMAP or SMTP.

Since most email clients are unable to handle OAuth tokens directly via the OAUTHBEARER / XOAUTH2 SASL mechanisms, the only practical workaround is to use App Passwords for these clients. An App Password is a specific, randomly generated password that bypasses the usual OAuth authentication flow but allows secure login. This solution is especially useful in environments where OAuth is enforced, yet compatibility with non-OAuth-compliant clients is still necessary.


Endpoints
Stalwart exposes several OAuth endpoints that clients use to obtain access tokens, authorize devices, and validate tokens. The endpoint behaviour is governed by the OidcProvider singleton (found in the WebUI under  Settings ›  Authentication › OIDC Provider), which defines token lifetimes, the authorization-code retry limit, and related policy.

/.well-known/oauth-authorization-server
The /.well-known/oauth-authorization-server endpoint is used to obtain metadata about the OAuth server’s configuration. This metadata, as defined by the OAuth 2.0 Authorization Server Metadata specification, includes information about all available OAuth endpoints, supported flows, token lifetimes, and other capabilities of the server.

Clients can request the metadata from this endpoint to dynamically discover the URLs of the authorization, token, device, and introspection endpoints, along with other essential details like supported scopes and signing algorithms. This provides clients with the necessary information to interact correctly with the OAuth server, reducing manual configuration and simplifying integration.

/auth/token
The /auth/token endpoint is the Token Endpoint of the OAuth server, responsible for issuing and refreshing access tokens. This is a central endpoint for all OAuth flows, as clients use it to exchange authorization codes, device codes, or refresh tokens for access tokens.

In the Authorization Code Flow, clients send the authorization code received after user consent to this endpoint to obtain an access token. In the Device Authorization Flow, the client exchanges the device code for an access token here after the user has completed authorization. Additionally, clients can use this endpoint to refresh access tokens using refresh tokens if they were issued during the initial token exchange.

/auth/device
The /auth/device endpoint is the Device Authorization Endpoint used in the Device Authorization Flow. This flow is specifically designed for devices with limited input capabilities, such as smart TVs or IoT devices, where traditional login methods are not feasible.

Clients initiate the Device Authorization Flow by making a request to this endpoint, providing the necessary client details. The server responds with a device code and a user code, along with instructions for the user to visit a URL (often on another device, such as a phone or computer) to enter the user code and approve the request. Once the user authorizes the client, the client polls the /auth/token endpoint using the device code to obtain an access token.

/auth/introspect
The /auth/introspect endpoint is the Token Introspection Endpoint, used to validate and inspect the status of access tokens. This endpoint allows resource servers to verify whether an access token is valid, expired, revoked, or has specific scopes or permissions attached to it.

When a resource server receives a request from a client using an access token, it can query this endpoint to confirm the token’s validity and associated metadata. The response will include details such as the token’s active status, expiration time, scopes, and the client ID it was issued to.

Conformed RFCs
RFC 6749 - The OAuth 2.0 Authorization Framework
RFC 6750 - The OAuth 2.0 Authorization Framework: Bearer Token Usage
RFC 8414 - OAuth 2.0 Authorization Server Metadata
RFC 8628 - OAuth 2.0 Device Authorization Grant
RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
RFC 7662 - OAuth 2.0 Token Introspection




OAuth Clients
An OAuth client is an application or service that requests access tokens from the Stalwart OAuth server on behalf of a user. Every client that participates in an OAuth flow is identified by a client id and, for confidential clients, a client secret. Registered clients are stored on the server so that redirect URIs, contact information, and secrets can be validated against a known record before tokens are issued.

Each registered client is represented by an OAuthClient object (found in the WebUI under  Management ›  Directory › OAuth Clients). Administrators can create, modify, and delete these objects from the WebUI or through the JMAP API; the same object is also created automatically when a client registers itself through the dynamic client registration endpoint.

Pre-registered and dynamically registered clients
There are two ways a client record appears in the server. The first is pre-registration, in which an administrator creates an OAuthClient object directly, typically for first-party applications such as the Stalwart WebUI or for a small set of known third-party integrations. The second is dynamic client registration, defined in RFC 7591, where the client itself calls the registration endpoint and the server creates the record in response. Dynamic registration is better suited to environments where many clients need to onboard without operator involvement, such as cloud services or IoT fleets; pre-registration is preferable when the set of trusted clients is small and well known.

Whether registration is mandatory is controlled by requireClientRegistration on the OidcProvider singleton (found in the WebUI under  Settings ›  Authentication › OIDC Provider). With the default value of false, any client id is accepted and the server issues tokens without consulting the registry. When set to true, every client must have a matching OAuthClient record, created either manually or through dynamic registration, before tokens are issued.

Client credentials
The client is identified by clientId, a string that must be unique across the server. Confidential clients additionally carry a secret that the client presents when exchanging authorization codes or requesting tokens through flows that require client authentication. The secret is stored hashed and is returned in clear only once, at the time it is set. Public clients, such as single-page applications and mobile apps that cannot keep a secret, leave the field empty and rely on PKCE for flow protection.

An expiresAt timestamp can be set to cause the client record to stop being accepted after a given date. A createdAt timestamp records when the record was issued. A description identifies the client in administrative listings, a logo supplies a visual indicator that can be shown on consent screens, and contacts records one or more email addresses for the party responsible for the client.

Redirect URIs
The redirectUris field enumerates the redirection endpoints the client may use at the end of an authorization code flow. The server refuses to complete a flow whose redirect_uri parameter does not exactly match one of the entries in this list, which prevents an attacker who learns a client id from redirecting authorization responses to a host they control. For native applications, this is also where the custom URI scheme used to return control to the app is declared; for instance, a native client might register a custom scheme such as myapp://auth.

Tenant scoping
In multi-tenant deployments, the memberTenantId field binds the client to a single Tenant. A tenant-scoped client can only request tokens for accounts within that tenant, and administrators of other tenants cannot see or modify it. Clients left without a tenant assignment are visible at the server level and can authenticate accounts regardless of tenancy.