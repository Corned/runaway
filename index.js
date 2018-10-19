const cheerio = require("cheerio")
const dotenv = require("dotenv")
const axios = require("axios")

const base_url = "http://www.hacker.org/runaway/index.php?"

dotenv.config()

const constructUrl = path => {
	return `${base_url}name=${process.env.USERNAME}&password=${process.env.PASSWORD}&path=${path}`
}

const getFlashvars = async () => {
	const response = await axios.get(`${base_url}name=${process.env.USERNAME}&password=${process.env.PASSWORD}`)
	
	if (response.data === "invalid user") {
		console.log("Invalid username or password.")
		process.exit(1)
	}
	
	return cheerio.load(response.data)('embed[flashvars]').attr("flashvars")
}

const solve = async () => {
	const flashvars = await getFlashvars()
	const properties = {}
	
	flashvars.split("&").map(s => {
		const [ k, v ] = s.split("=")
		properties[k] = v
	})

	const movementLength = [ properties.FVinsMin, properties.FVinsMax ]
	const board = []

	for (let y = 0; y < properties.FVboardY; y++) {
		board[y] = []
		for (let x = 0; x < properties.FVboardX; x++) {
			board[y][x] = properties.FVterrainString[y * properties.FVboardY + x]
		}
	}


	// REDUCE
	console.time("reduce")
	for (let x = 0; x < properties.FVboardX; x++) {
		let do_reduce = false
		for (let y = 0; y < properties.FVboardY; y++) {
			const isBad = board[y][x] === "X"
			if (isBad) {
				do_reduce = true
				continue
			}

			if (do_reduce) {
				if (x > 0) {
					if (board[y][x - 1] === "X") {
						board[y][x] = "X"
					} else {
						do_reduce = false
					}
				} else {
					board[y][x] = "X"
				}
			}
		}
	}

	for (let y = 0; y < properties.FVboardY; y++) {
		let do_reduce = false
		for (let x = 0; x < properties.FVboardX; x++) {
			const isBad = board[y][x] === "X"
			if (isBad) {
				do_reduce = true
			}

			if (do_reduce) {
				if (y > 0) {
					if (board[y - 1][x] === "X") {
						board[y][x] = "X"
					} else {
						do_reduce = false
					}
				} else {
					board[y][x] = "X"
				}
			}
		}
	}

	while (true) {
		let change = false
		for (let x = 1; x < properties.FVboardX - 1; x++) {
			for (let y = 1; y < properties.FVboardY - 1; y++) {
				if (board[y][x] === "X") {
					continue
				}

				let walls = 0
				walls += board[y + 1][x] === "X" ? 1 : 0
				walls += board[y - 1][x] === "X" ? 1 : 0
				walls += board[y][x + 1] === "X" ? 1 : 0
				walls += board[y][x - 1] === "X" ? 1 : 0

				if (walls >= 3) {
					board[y][x] = "X"
					change = true
				}
			}
		}

		if (!change ) {
			break
		}
	}
	
	while (true) {
		let change = false
		for (let x = 0; x < properties.FVboardX - 1; x++) {
			for (let y = 0; y < properties.FVboardY - 1; y++) {
				if (board[y][x] === "X") {
					continue
				}

				let walls = 0
				walls += board[y + 1][x] === "X" ? 1 : 0
				walls += board[y][x + 1] === "X" ? 1 : 0

				if (walls === 2) {
					board[y][x] = "X"
					change = true
				}
			}
		}

		if (!change) {
			break
		}
	}
	console.timeEnd("reduce")
	console.time("solve")
	pretty(board)
	const path = d(board, "", properties.FVinsMin, properties.FVinsMax)
	console.timeEnd("solve")
	return path
}

const d = (board, path = "", min, max) => {
	if (path.length >= min && path.length <= max) {
		if (hit(board, path)) {
			return path
		}
	}

	if (path.length > max) {
		return
	}

	for (let input of ["R", "D"]) {
		const output = d(board, path + input, min, max)
		if (typeof output === "string") {
			return output
		}
	}
}

const hit = (board, path) => {
	let x = 0
	let y = 0

	while (true) {
		for (let i = 0; i < path.length; i++) {
			const input = path[i]
			const dx = input === "R" ? 1 : 0
			const dy = input === "D" ? 1 : 0

			if (y + dy >= board.length || x + dx >= board[0].length) {
				return true
			}

			if (board[y + dy][x + dx] === "X") {
				// hit a wall
				return false
			}

			x += dx
			y += dy
		}	
	}
}

const pretty = board => {
	for (let row of board) {
		console.log(row.join(""))
	}
}


(async () => {
	let currentLevel = 92
	while (true) {
		console.log("solving", currentLevel)
		let answer = await solve()
		let url = constructUrl(answer)

		await axios.get(url)

		console.log(currentLevel, answer)
		currentLevel++
	}
})()