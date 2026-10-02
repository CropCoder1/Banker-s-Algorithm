# Banker's Algorithm — Deadlock Avoidance Simulator

An interactive, browser-based Operating Systems learning tool for exploring how the **Banker's Algorithm** evaluates resource allocation and avoids deadlocks. Configure processes and resource types, edit the matrices, and see the safety check recalculate instantly.

> **Frontend only:** all calculations run locally in your browser. No backend or account is required.

## Description

The Banker's Algorithm is a deadlock-avoidance method that grants a resource request only when the resulting system state remains safe. This simulator makes the algorithm easier to understand by connecting the Allocation, Max, Need, and Available values to a visible safety trace and safe sequence.

## Highlights

- Configure **1–10 processes** and **1–6 resource types**.
- Rename resource types and enter the total number of instances for each.
- Edit the Allocation and Max matrices with immediate feedback.
- Automatically calculate **Need = Max − Allocation** and **Available = Total − Allocated**.
- Follow each safety-check step, including the process need, work vector, and resources released.
- Try a resource request for a selected process and see whether granting it preserves a safe state.
- Review the resulting safe sequence or understand why the current state is unsafe.
- Reset to start a fresh simulation.
- Responsive dark interface with glass-style panels, blue accents, and subtle motion.

## Getting started

### Requirements

- Node.js 18 or newer
- npm

### Install and run

```bash
npm install
npm start
```

The development server opens at [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
```

The optimized static site is generated in the `build/` directory.

## Using the simulator

1. Set the number of processes and resource types.
2. Enter the **total instances** available for every resource type.
3. Fill in the Allocation and Max matrices. For every cell, Max should be greater than or equal to Allocation.
4. Review the automatically calculated Need matrix and Available vector.
5. Read the safety-check trace and safe sequence.
6. To test a request, select a process, enter its requested resource vector, and choose **Simulate Request**.

If a total is missing or is smaller than the amount already allocated, the simulator reports that input issue instead of presenting an invalid safety result.

## How the safety check works

For each resource type `j` and process `i`:

```text
Need[i][j] = Max[i][j] - Allocation[i][j]
Available[j] = Total[j] - sum(Allocation[i][j])
```

The simulator starts with `Work = Available`. It repeatedly finds an unfinished process whose `Need` is no greater than `Work` for every resource. Once that process can finish, its allocated resources are returned to `Work`. If every process can finish, the order is a **safe sequence**; if the algorithm gets stuck before all processes finish, the state is unsafe.

For a resource request, the simulator first checks that the request does not exceed either the process's remaining need or the available resources. It then temporarily evaluates the resulting state and accepts the request only if that state is safe. The request simulation does not permanently change the allocation matrix.

## Built with

- React
- JavaScript
- Create React App
- CSS

## Project layout

```text
src/
  App.js       Simulator UI and Banker's Algorithm calculations
  App.css      Responsive theme, layout, and animations
  index.js     React entry point
  index.css    Global styles
```

## Educational note

This project is intended for learning and demonstration. It models the classic Banker's Algorithm and does not manage real operating-system processes or resources.
