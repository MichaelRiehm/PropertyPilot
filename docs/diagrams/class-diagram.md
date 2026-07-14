# PropertyPilot — Domain Class Diagram

Inheritance, polymorphism, and encapsulation in the domain layer.

- **Inheritance** — every concrete class extends `Entity` (abstract).
- **Polymorphism** — `validate()` is abstract on `Entity` and implemented per class. `toReportRow()` is declared on the `Reportable` interface and implemented per class with different shapes.
- **Encapsulation** — all instance state is private. Reads go through getters; mutations go through intention-revealing methods (`Property.rename()`, `Lease.terminate()`, ...) that call the protected `Entity.touch()` to maintain the `updatedAt` invariant.

Source: [`class-diagram.mmd`](class-diagram.mmd).

```mermaid
classDiagram
    direction LR

    class Entity {
        <<abstract>>
        -id: string
        -createdAt: Date
        -updatedAt: Date
        +get id() string
        +get createdAt() Date
        +get updatedAt() Date
        #touch() void
        +validate()* ValidationResult
    }

    class Reportable {
        <<interface>>
        +toReportRow() Record~string, unknown~
    }

    class Property {
        -ownerId: string
        -name: string
        -addressLine1: string
        -addressLine2: string?
        -city: string
        -state: string
        -postalCode: string
        -propertyType: PropertyType
        +rename(name) void
        +updateAddress(addr) void
        +changeType(type) void
        +fullAddress() string
        +validate() ValidationResult
        +toReportRow() Record
    }

    class Unit {
        -propertyId: string
        -label: string
        -bedrooms: number
        -bathrooms: number
        -squareFeet: number?
        -marketRent: number
        +relabel(label) void
        +updateSpecs(specs) void
        +setMarketRent(amount) void
        +validate() ValidationResult
        +toReportRow() Record
    }

    class Tenant {
        -ownerId: string
        -firstName: string
        -lastName: string
        -email: string
        -phone: string?
        +fullName() string
        +updateContact(contact) void
        +updateName(first, last) void
        +validate() ValidationResult
        +toReportRow() Record
    }

    class Lease {
        -unitId: string
        -tenantId: string
        -startDate: Date
        -endDate: Date
        -monthlyRent: number
        -securityDeposit: number
        -status: LeaseStatus
        -documentLink: string?
        +activate() void
        +terminate() void
        +extendTo(date) void
        +setRent(rent, deposit) void
        +attachDocument(url) void
        +isActiveOn(date) boolean
        +termInMonths() number
        +validate() ValidationResult
        +toReportRow() Record
    }

    class Transaction {
        -propertyId: string
        -unitId: string?
        -leaseId: string?
        -type: TransactionType
        -category: string?
        -amount: number
        -date: Date
        -description: string
        +isIncome() boolean
        +signedAmount() number
        +reclassify(category) void
        +correctAmount(amount) void
        +updateDescription(text) void
        +validate() ValidationResult
        +toReportRow() Record
    }

    class MaintenanceTicket {
        -propertyId: string
        -unitId: string?
        -title: string
        -description: string
        -status: MaintenanceStatus
        -priority: MaintenancePriority
        -reportedAt: Date
        -resolvedAt: Date?
        +isOpen() boolean
        +ageInDays(asOf) number
        +updateDetails(details) void
        +setPriority(priority) void
        +start() void
        +close(resolvedAt) void
        +cancel() void
        +validate() ValidationResult
        +toReportRow() Record
    }

    Entity <|-- Property
    Entity <|-- Unit
    Entity <|-- Tenant
    Entity <|-- Lease
    Entity <|-- Transaction
    Entity <|-- MaintenanceTicket

    Reportable <|.. Property
    Reportable <|.. Unit
    Reportable <|.. Tenant
    Reportable <|.. Lease
    Reportable <|.. Transaction
    Reportable <|.. MaintenanceTicket

    Property "1" o-- "*" Unit : has
    Property "1" o-- "*" Transaction : ledger
    Property "1" o-- "*" MaintenanceTicket : tickets
    Unit "1" o-- "*" Lease : leased via
    Tenant "1" o-- "*" Lease : signs
    Unit "0..1" o-- "*" Transaction : optional unit
    Lease "0..1" o-- "*" Transaction : rent activity
    Unit "0..1" o-- "*" MaintenanceTicket : optional unit
```
