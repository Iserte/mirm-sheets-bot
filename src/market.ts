import fs, { writeFileSync } from 'fs';
import axios from 'axios';

interface MarketApi {
  code: number;
  data: {
    code: number;
    list: Item[];
    tradeMaxUid: string;
    pageSize: string;
    totalCount: number;
  }
}

interface Item {
  reinforce: number;
  price: number;
  tradeDate: string;
  tradeCount: number;
  itemName: string;
  imgPath: string;
  grade: string
}

class Market {
  constructor() {

  }

  async getPrices() {
    const endDate = new Date();

    const days = 7
    const startDate = endDate;
    startDate.setDate(endDate.getDate() - days)

    const formattedEndDate = endDate.toISOString().replace(/\.[0-9]+Z/g, "").replace(/T/g, "+")
    const formattedStartDate = startDate.toISOString().replace(/\.[0-9]+Z/g, "").replace(/T/g, "+")

    let page = 1
    const pageSize = 255

    const itemName = "Cajado do Demônio de Sangue Azul";

    let url = `https://droneapi.mirmglobal.com/ex/item/lists?languageCode=pt&itemName=${itemName}&page=${page}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&pageSize=${pageSize}&reinforceMin=0&reinforceMax=25&tradeUidMax=0`;
    const { data } = (await axios.get(url)).data as MarketApi
    console.log(url)

    const totalCount = data.totalCount
    const totalPages = Math.ceil(totalCount / pageSize)

    // data.list[0].price / data.list[0].tradeCount // individual price

    let items: Item[] = []

    while (page < totalPages) {
      url = `https://droneapi.mirmglobal.com/ex/item/lists?languageCode=pt&itemName=${itemName}&page=${page}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&pageSize=${pageSize}&reinforceMin=0&reinforceMax=25&tradeUidMax=0`;
      const { data } = (await axios.get(url)).data as MarketApi

      items = [...items, ...data.list];
      page = page + 1;
    }

    writeFileSync("teste.json", JSON.stringify(items));
    console.log("Arquivo atualizado com sucesso!")


    let reinforceLevel = 0
    while (reinforceLevel <= 25) {
      const _items = items.filter(item => item.reinforce === reinforceLevel)
      console.log(`O preço médio nos ultimos ${days} dias para o item [${itemName} +${reinforceLevel}] é de: $${(_items.map(item => item.price).reduce((prev, curr) => prev + curr, 0) / _items.length || 0).toFixed(2)} (Menor: $${isFinite(Math.min(..._items.map(item => item.price))) ? Math.min(..._items.map(item => item.price)) : 0} Maior: $${isFinite(Math.max(..._items.map(item => item.price))) ? Math.max(..._items.map(item => item.price)) : 0})`)
      reinforceLevel = reinforceLevel + 1;
    }
  }
}

export default new Market();
